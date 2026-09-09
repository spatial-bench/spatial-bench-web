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
  return points.filter((point) => filters.every((f) => filterMatches(point, f)));
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

export function compareValues(a: string, b: string): number {
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
      return String(a.x).localeCompare(String(b.x));
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

export interface SeriesStyle {
  colour: string;
  /** 0 = full brightness, up to the number of brightness steps. */
  brightness: number;
  dash: string;
}

export function assignStyles(series: Series[], spec: ChartSpec): SeriesStyle[] {
  const colourValues = spec.channels.colour
    ? [...new Set(series.map((s) => s.identity[spec.channels.colour ?? ""]))]
    : [];
  const brightnessValues = spec.channels.brightness
    ? [...new Set(series.map((s) => s.identity[spec.channels.brightness ?? ""]))]
    : [];
  const dashValues = spec.channels.lineStyle
    ? [...new Set(series.map((s) => s.identity[spec.channels.lineStyle ?? ""]))]
    : [];

  return series.map((s) => {
    const colourIndex = spec.channels.colour
      ? Math.max(0, colourValues.indexOf(s.identity[spec.channels.colour]))
      : 0;
    const colour =
      COLOUR_PALETTE[colourIndex % COLOUR_PALETTE.length] ?? COLOUR_PALETTE[0]!;
    const brightness = spec.channels.brightness
      ? Math.max(0, brightnessValues.indexOf(s.identity[spec.channels.brightness]))
      : 0;
    const dashIndex = spec.channels.lineStyle
      ? Math.max(0, dashValues.indexOf(s.identity[spec.channels.lineStyle]))
      : 0;
    return {
      colour,
      brightness,
      dash: DASH_PATTERNS[dashIndex % DASH_PATTERNS.length] ?? "",
    };
  });
}
