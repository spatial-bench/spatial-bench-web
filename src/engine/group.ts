import { coerce, compare } from "semver";
import type { ChartSpec, Field, Filter, Panel, ResolvedPoint, Series } from "./model";
import { isCoreField } from "./model";

/**
 * The grouping engine: resolved points + a spec → panels → charts → series.
 * Pure functions only, so the whole visual layer hangs off testable data
 * transforms and re-charting is a re-run, not a refetch.
 */

/** Read a point's value for a field: core column first, then extension tags. */
export function fieldValue(point: ResolvedPoint, field: Field): string {
  if (isCoreField(field)) {
    return String(point.core[field]);
  }
  return point.tags[field] ?? "";
}

export function applyFilters(
  points: ResolvedPoint[],
  filters: Filter[],
): ResolvedPoint[] {
  // Plain comparisons first; then any `latest` filter reduces the surviving
  // points to each library's highest version — the latest releases of every
  // relevant library, measured side by side.
  let out = points.filter((point) =>
    filters.filter((f) => f.op !== "latest").every((f) => filterMatches(point, f)),
  );
  for (const latest of filters.filter((f) => f.op === "latest")) {
    const field = latest.field;
    // Per library: the highest version present. Then keep every point at
    // that version — not a single representative point.
    const best = new Map<string, string>();
    for (const point of out) {
      const library = fieldValue(point, "impl");
      const version = fieldValue(point, field);
      const current = best.get(library);
      if (current === undefined || versionCompare(version, current) > 0) {
        best.set(library, version);
      }
    }
    out = out.filter((point) => {
      const library = fieldValue(point, "impl");
      const version = fieldValue(point, field);
      const newest = best.get(library);
      return newest !== undefined && versionCompare(version, newest) === 0;
    });
  }
  return out;
}

/** Compare dot-separated numeric versions ("6.3.0" vs "10.0.0") properly. */
export function versionCompare(a: string, b: string): number {
  const va = coerce(a);
  const vb = coerce(b);
  if (va !== null && vb !== null) return compare(va, vb);
  return a.localeCompare(b);
}

function filterMatches(point: ResolvedPoint, filter: Filter): boolean {
  const value = fieldValue(point, filter.field);
  switch (filter.op) {
    case "eq":
      return value === filter.values[0];
    case "ne":
      return value !== filter.values[0];
    case "in":
      return filter.values.includes(value);
    // Handled across the whole filtered set by applyFilters, never per point.
    case "latest":
      return true;
  }
}

/** Distinct values of a field across points, sorted — dropdown contents. */
export function distinctValues(points: ResolvedPoint[], field: Field): string[] {
  const values = new Set<string>();
  for (const point of points) {
    const value = fieldValue(point, field);
    if (value !== "") values.add(value);
  }
  return [...values].sort(compareValues);
}

const VERSION_LIKE = /^\d+(\.\d+)+$/;

export function compareValues(a: string, b: string): number {
  // Dot-separated numeric versions order semantically: 1.10 > 1.9.
  if (VERSION_LIKE.test(a) && VERSION_LIKE.test(b)) {
    return versionCompare(a, b);
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== "" && b !== "") {
    return na - nb;
  }
  return a.localeCompare(b);
}

const identityKey = (identity: Record<string, string>): string =>
  Object.entries(identity)
    .map(([k, v]) => `${k}=${v}`)
    .join("\u0000");

/**
 * Group the points into panels → charts → series.
 *
 * A series is the set of points sharing one identity: the resolved values of
 * the spec's seriesKeys. Within a series, points are deduped per x (a
 * re-benchmark of the same case must not draw two dots) and ordered.
 */
export function buildPanels(points: ResolvedPoint[], spec: ChartSpec): Panel[] {
  const filtered = applyFilters(points, spec.filters);

  const panels = groupBy(filtered, spec.panelKey);
  const result: Panel[] = [];
  for (const [panelValue, panelPoints] of panels) {
    const charts = groupBy(panelPoints, spec.chartKey);
    const panel: Panel = {
      identity: spec.panelKey ? { [spec.panelKey]: panelValue } : {},
      charts: [],
    };
    for (const [chartValue, chartPoints] of charts) {
      panel.charts.push({
        identity: { [spec.chartKey]: chartValue },
        series: buildSeries(chartPoints, spec),
      });
    }
    panel.charts.sort(byIdentity(spec.chartKey));
    result.push(panel);
  }
  result.sort(byIdentity(spec.panelKey ?? ""));
  return result;
}

function byIdentity(field: Field) {
  return (
    a: { identity: Record<string, string> },
    b: { identity: Record<string, string> },
  ) => compareValues(a.identity[field] ?? "", b.identity[field] ?? "");
}

function buildSeries(chartPoints: ResolvedPoint[], spec: ChartSpec): Series[] {
  const byIdentity = new Map<string, ResolvedPoint[]>();
  for (const point of chartPoints) {
    const identity: Record<string, string> = {};
    for (const key of spec.seriesKeys) {
      identity[key] = fieldValue(point, key);
    }
    const id = identityKey(identity);
    const bucket = byIdentity.get(id);
    if (bucket) bucket.push(point);
    else byIdentity.set(id, [point]);
  }

  const series: Series[] = [];
  for (const [id, points] of byIdentity) {
    const identity = Object.fromEntries(
      id.split("\u0000").map((pair) => {
        const eq = pair.indexOf("=");
        return [pair.slice(0, eq), pair.slice(eq + 1)];
      }),
    );
    series.push({ identity, points: seriesPoints(points, spec) });
  }
  series.sort(
    (a, b) =>
      spec.seriesKeys
        .map((key) => compareValues(a.identity[key] ?? "", b.identity[key] ?? ""))
        .find((c) => c !== 0) ?? 0,
  );
  return series;
}

/** Dedupe per x, then order. */
function seriesPoints(points: ResolvedPoint[], spec: ChartSpec): Series["points"] {
  const perX = new Map<string, ResolvedPoint>();
  for (const point of points) {
    const x = String(point.core[spec.x]);
    const existing = perX.get(x);
    if (
      existing === undefined ||
      (spec.dedupe === "latest" && point.startedAt > existing.startedAt) ||
      (spec.dedupe === "median" &&
        (point.medianNs ?? point.latencyNs) < (existing.medianNs ?? existing.latencyNs))
    ) {
      perX.set(x, point);
    }
  }
  return [...perX.values()]
    .map((point) => ({
      x: xValue(point, spec.x),
      y: yValue(point, spec.y),
      point,
    }))
    .sort((a, b) => {
      const na = Number(a.x);
      const nb = Number(b.x);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return compareValues(String(a.x), String(b.x));
    });
}

function xValue(point: ResolvedPoint, x: ChartSpec["x"]): number | string {
  if (x === "tree_size") return Number(point.core.tree_size);
  if (x === "version") return point.core.version;
  return point.startedAt;
}

function yValue(point: ResolvedPoint, y: ChartSpec["y"]): number {
  if (y === "throughput_qps") return point.throughputQps ?? 0;
  return point.medianNs ?? point.latencyNs;
}

function groupBy(
  points: ResolvedPoint[],
  field: Field | undefined,
): Map<string, ResolvedPoint[]> {
  const groups = new Map<string, ResolvedPoint[]>();
  if (field === undefined) {
    groups.set("", points);
    return groups;
  }
  for (const point of points) {
    const value = fieldValue(point, field);
    const bucket = groups.get(value);
    if (bucket) bucket.push(point);
    else groups.set(value, [point]);
  }
  return groups;
}

/**
 * Visual-channel assignment: every series gets a colour (from the palette,
 * by the colour channel's value), a brightness step (lightness of that hue,
 * by the brightness channel's value) and a dash pattern. Series whose
 * channels coincide are genuinely indistinguishable — that is the user's
 * spec saying they should be.
 */
export const COLOUR_PALETTE = [
  "#60a5fa",
  "#f87171",
  "#4ade80",
  "#facc15",
  "#c084fc",
  "#f472b6",
  "#2dd4bf",
  "#fb923c",
];

export const DASH_PATTERNS = ["", "6 3", "2 3", "8 3 2 3", "12 3 2 3 2 3"];
/** Opacity steps for the brightness channel: 0 = full brightness. */
export const BRIGHTNESS_OPACITY = [1, 0.7, 0.45, 0.3];

export interface SeriesStyle {
  colour: string;
  /** 0 = full brightness, up to the number of brightness steps. */
  brightness: number;
  dash: string;
  /** Index into MARKER_SHAPES — the point glyph this series draws. */
  marker: number;
  /** Stroke width step for the polyline. */
  width: number;
}

export const MARKER_SHAPES = [
  "circle",
  "square",
  "diamond",
  "triangle",
  "cross",
] as const;
export const WIDTH_STEPS = [1.5, 2.5, 3.5, 4.5];

/**
 * One channel's combos, ordered field-wise, and a lookup for a series. Each
 * combination of the channel's fields' values gets its own visual treatment.
 */
function channelIndexer(
  fields: Field[] | undefined,
  series: Series[],
): (identity: Record<string, string>) => number {
  if (!fields || fields.length === 0) return () => 0;
  const comboOf = (identity: Record<string, string>): string =>
    fields.map((f) => identity[f] ?? "").join("\u0000");
  const combos = [...new Set(series.map((s) => comboOf(s.identity)))];
  combos.sort((a, b) => {
    const pa = a.split("\u0000");
    const pb = b.split("\u0000");
    for (let i = 0; i < Math.min(pa.length, pb.length); i += 1) {
      const order = compareValues(pa[i] ?? "", pb[i] ?? "");
      if (order !== 0) return order;
    }
    return 0;
  });
  const indexOf = new Map(combos.map((combo, index) => [combo, index]));
  return (identity: Record<string, string>) =>
    Math.max(0, indexOf.get(comboOf(identity)) ?? 0);
}

export function assignStyles(series: Series[], spec: ChartSpec): SeriesStyle[] {
  const colour = channelIndexer(spec.channels.colour, series);
  const brightness = channelIndexer(spec.channels.brightness, series);
  const lineStyle = channelIndexer(spec.channels.lineStyle, series);
  const marker = channelIndexer(spec.channels.marker, series);
  const width = channelIndexer(spec.channels.width, series);
  return series.map((s) => ({
    colour: COLOUR_PALETTE[colour(s.identity) % COLOUR_PALETTE.length]!,
    brightness: brightness(s.identity) % (BRIGHTNESS_OPACITY.length - 1),
    dash: DASH_PATTERNS[lineStyle(s.identity) % DASH_PATTERNS.length] ?? "",
    marker: marker(s.identity) % MARKER_SHAPES.length,
    width: WIDTH_STEPS[width(s.identity) % WIDTH_STEPS.length] ?? 2,
  }));
}
