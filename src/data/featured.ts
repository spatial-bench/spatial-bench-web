import { assignStyles, buildPanels } from "../engine/group";
import type { ChartSpec, ResolvedPoint } from "../engine/model";
import { specToQuery } from "../engine/url";
import snapshot from "./featured.json";

export const featuredCharts = ["f32", "f64"].map((axis) => {
  const spec: ChartSpec = {
    filters: Object.entries({
      machine_hash: "anxrmnkpfa-qxmvv",
      query: "exact_nn",
      k: "1",
      dims: "3",
      dataset: "uniform",
      metric: "squared_euclidean",
      parallelism: "single_threaded",
      query_batching: "single_query",
      config: "default",
      query_count: "1000",
      axis,
    }).map(([field, value]) => ({ field, op: "eq", values: [value] })),
    chartKey: "axis",
    seriesKeys: ["impl", "version"],
    channels: { colour: ["impl", "version"] },
    x: "tree_size",
    y: "latency_ns",
    xScale: "log",
    yScale: "log",
    dedupe: "latest",
  };
  spec.filters.push({ field: "version", op: "latest", values: [] });
  const chart = buildPanels(snapshot.points as unknown as ResolvedPoint[], spec)[0]!
    .charts[0]!;
  return {
    axis,
    chart,
    spec,
    styles: assignStyles(chart.series, spec),
    href: `/explore?${specToQuery(spec)}`,
  };
});
export { snapshot };
