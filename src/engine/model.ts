/**
 * The charting engine's core model.
 *
 * Everything the UI produces is a {@link ChartSpec}: a pure description of
 * what gets charted. The grouping engine turns the dataset's resolved points
 * into panels → charts → series from it, and the React layer draws whatever
 * falls out. Keeping the spec pure is what makes views shareable (the whole
 * spec serialises into the URL) and re-renders cheap (grouping is a pure
 * function of spec + dataset).
 *
 * A "field" is anything a filter, a series, a chart key or a panel key can
 * name: a core column of the points table (a closed-vocabulary identity key)
 * or an extension tag from `point_tags` (kiddo.stem and friends).
 */

export type CoreField =
  | "impl"
  | "version"
  | "axis"
  | "query"
  | "k"
  | "dims"
  | "metric"
  | "dataset"
  | "parallelism"
  | "query_batching"
  | "isa"
  | "config"
  | "tree_size"
  | "query_count"
  | "query_batch_size"
  | "machine_hash"
  | "started_at";

/** Any field the engine can group or filter on. */
export type Field = CoreField | (string & {});

export const isCoreField = (f: Field): f is CoreField =>
  CORE_FIELDS.has(f as CoreField);

const CORE_FIELDS: ReadonlySet<string> = new Set([
  "impl",
  "version",
  "axis",
  "query",
  "k",
  "dims",
  "metric",
  "dataset",
  "parallelism",
  "query_batching",
  "isa",
  "config",
  "tree_size",
  "query_count",
  "query_batch_size",
  "machine_hash",
  "started_at",
]);

/** One resolved row of the dataset: core columns merged with extension tags. */
export interface ResolvedPoint {
  id: number;
  runId: string;
  /** The machine that measured this point — a mandatory filter dimension. */
  machineHash: string;
  startedAt: string;
  core: Record<CoreField, string | number>;
  /** kiddo.stem and friends, keyed by their namespaced tag. */
  tags: Record<string, string>;
  latencyNs: number;
  latencyLower: number | null;
  latencyUpper: number | null;
  throughputQps: number | null;
  medianNs: number | null;
  madNs: number | null;
  stdDevNs: number | null;
  samples: number | null;
}

export type XField = "tree_size" | "version" | "started_at";
export type YField = "latency_ns" | "throughput_qps";
export type Scale = "log" | "linear";

/** Comparison operators for filters. `in` = any-of (the dropdown case). */
export type FilterOp = "eq" | "ne" | "in";

export interface Filter {
  field: Field;
  op: FilterOp;
  values: string[];
}

/**
 * Which series key drives which visual channel. Colour is categorical
 * (a palette entry per value); brightness encodes a second key as lightness
 * steps of the colour's hue; lineStyle as dash patterns. A channel left
 * unassigned means that dimension is not drawn — it collapses into the
 * series identity and the legend only.
 */
export interface Channels {
  colour?: Field;
  brightness?: Field;
  lineStyle?: Field;
}

export interface ChartSpec {
  /** Hard AND constraints applied before any grouping. */
  filters: Filter[];
  /** Optional panel grouping: one panel per distinct value. */
  panelKey?: Field;
  /** One chart per distinct value of this field. Required. */
  chartKey: Field;
  /** The series dimensions, in the order the legend shows them. */
  seriesKeys: Field[];
  channels: Channels;
  x: XField;
  y: YField;
  xScale: Scale;
  yScale: Scale;
  /**
   * How a series with several points at the same x combines. `latest` takes
   * the most recent run's point (re-benchmarks supersede); `median` pools
   * them. The common case is one run per (series, x) and neither fires.
   */
  dedupe: "latest" | "median";
}

/** One series' points on one chart, ordered by x, ready to draw. */
export interface Series {
  /** The resolved values of the seriesKeys, e.g. { impl: "kiddo", version: "6.3.0" }. */
  identity: Record<string, string>;
  points: { x: number | string; y: number; point: ResolvedPoint }[];
}

export interface Chart {
  /** The chartKey value this chart holds, e.g. { dataset: "uniform" }. */
  identity: Record<string, string>;
  series: Series[];
}

export interface Panel {
  identity: Record<string, string>;
  charts: Chart[];
}
