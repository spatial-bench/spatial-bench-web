import { describe, expect, test } from "vitest";
import { applyFilters, buildPanels, compareValues, distinctValues } from "./group";
import type { ChartSpec, Panel, ResolvedPoint } from "./model";

const point = (
  id: number,
  core: ResolvedPoint["core"],
  tags: ResolvedPoint["tags"],
  latency = 100,
  startedAt = "2026-09-07T00:00:00Z",
): ResolvedPoint => ({
  id,
  runId: `run-${id}`,
  machineHash: "anxrmnkpfa-qxmvv",
  startedAt,
  core,
  tags,
  latencyNs: latency,
  latencyLower: latency - 1,
  latencyUpper: latency + 1,
  throughputQps: 1e9 / latency,
  medianNs: latency,
  madNs: 0.1,
  stdDevNs: 0.2,
  samples: 30,
});

const base = {
  impl: "kiddo",
  axis: "f64",
  query: "exact_nn",
  k: 1,
  dims: 3,
  metric: "squared_euclidean",
  dataset: "uniform",
  parallelism: "single_threaded",
  query_batching: "single_query",
  isa: "native",
  config: "default",
  query_count: 1000,
  query_batch_size: 0,
  machine_hash: "anxrmnkpfa-qxmvv",
  started_at: "2026-09-07T00:00:00Z",
};

describe("grouping engine", () => {
  const points: ResolvedPoint[] = [
    // kiddo 6.3.0, uniform, f64: a tree-size sweep
    ...[65536, 131072, 262144].map((tree_size, i) =>
      point(
        100 + i,
        { ...base, tree_size, version: "6.3.0" },
        {
          "kiddo.bucket": "32",
        },
        90 + i * 10,
      ),
    ),
    // kiddo 5.3.3, uniform, f64: same sweep, different version
    ...[65536, 131072, 262144].map((tree_size, i) =>
      point(
        200 + i,
        { ...base, tree_size, version: "5.3.3" },
        {
          "kiddo.bucket": "32",
        },
        110 + i * 10,
      ),
    ),
    // kiddo 6.3.0, gaussian: a second chart when the chartKey is dataset
    point(
      300,
      { ...base, tree_size: 65536, dataset: "gaussian", version: "6.3.0" },
      {},
      70,
    ),
    // a f32 point the f64 filter must exclude
    point(400, { ...base, axis: "f32", tree_size: 65536, version: "6.3.0" }, {}, 50),
    // a re-benchmark of the same case: `latest` dedupe must supersede
    point(
      101,
      { ...base, tree_size: 65536, version: "6.3.0" },
      {},
      999,
      "2026-09-08T00:00:00Z",
    ),
  ];

  const spec: ChartSpec = {
    filters: [{ field: "axis", op: "eq", values: ["f64"] }],
    chartKey: "dataset",
    seriesKeys: ["impl", "version"],
    channels: { colour: ["impl"], brightness: ["version"] },
    x: "tree_size",
    y: "latency_ns",
    xScale: "linear",
    yScale: "log",
    dedupe: "latest",
  };

  test("filters apply before grouping", () => {
    // 3 v6 sweep + 3 v5 sweep + 1 gaussian + 1 rerun; the f32 point drops.
    expect(applyFilters(points, spec.filters)).toHaveLength(8);
  });

  test("distinct values feed the dropdowns", () => {
    expect(distinctValues(points, "axis")).toEqual(["f32", "f64"]);
    expect(distinctValues(points, "version")).toEqual(["5.3.3", "6.3.0"]);
  });

  test("the chart key splits one chart per dataset", () => {
    const panels: Panel[] = buildPanels(points, spec);
    expect(panels).toHaveLength(1); // no panelKey → one panel
    const panel = panels[0]!;
    expect(panel.charts.map((c) => c.identity.dataset).sort()).toEqual([
      "gaussian",
      "uniform",
    ]);
  });

  test("series split on identity and dedupe on latest", () => {
    const panel = buildPanels(points, spec)[0]!;
    const uniform = panel.charts.find((c) => c.identity.dataset === "uniform");
    expect(uniform?.series).toHaveLength(2);
    const v6 = uniform?.series.find((s) => s.identity.version === "6.3.0");
    expect(v6?.points).toHaveLength(3);
    // point 101 (999ns, later run) supersedes point 100 (90ns)
    expect(v6?.points[0]?.y).toBe(999);
  });

  test("median dedupe prefers the better measurement instead", () => {
    const panel = buildPanels(points, { ...spec, dedupe: "median" })[0]!;
    const uniform = panel.charts.find((c) => c.identity.dataset === "uniform");
    const v6 = uniform?.series.find((s) => s.identity.version === "6.3.0");
    expect(v6?.points[0]?.y).toBe(90);
  });

  test("version ordering is semantic: 1.10 sorts after 1.9", () => {
    expect(compareValues("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareValues("1.10", "1.9")).toBeGreaterThan(0);
    expect(compareValues("2.0.0", "10.0.0")).toBeLessThan(0);
  });

  test("version dropdown options order semantically", () => {
    const extra: ResolvedPoint[] = [
      point(600, { ...base, tree_size: 65536, version: "1.9.0" }, {}),
      point(601, { ...base, tree_size: 65536, version: "1.10.0" }, {}),
      point(602, { ...base, tree_size: 65536, version: "1.2.0" }, {}),
    ];
    const all = [...points, ...extra];
    const ordered = distinctValues(all, "version");
    const idx = (v: string) => ordered.indexOf(v);
    expect(idx("1.10.0")).toBeGreaterThan(idx("1.9.0"));
    expect(idx("1.9.0")).toBeGreaterThan(idx("1.2.0"));
  });

  test("latest keeps every point at the newest version, not one per library", () => {
    // 6.3.0 has points at three tree sizes; all must survive the filter.
    const kept = applyFilters(points, [
      { field: "axis", op: "eq", values: ["f64"] },
      { field: "query", op: "eq", values: ["exact_nn"] },
      { field: "version", op: "latest", values: [] },
    ]);
    const kiddo = kept.filter((p) => String(p.core.version) === "6.3.0");
    expect(kiddo.length).toBeGreaterThanOrEqual(3);
  });

  test("the latest filter keeps each library's newest version", () => {
    // kiddo has 5.3.3 and 6.3.0; the latest filter keeps 6.3.0 per library.
    const latest = applyFilters(points, [
      { field: "axis", op: "eq", values: ["f64"] },
      { field: "version", op: "latest", values: [] },
    ]);
    const versions = new Set(
      latest.filter((p) => p.core.impl === "kiddo").map((p) => String(p.core.version)),
    );
    expect([...versions]).toEqual(["6.3.0"]);
  });

  test("latest compares versions numerically, not lexically", () => {
    const future: ResolvedPoint[] = [
      point(500, { ...base, tree_size: 65536, version: "10.0.0" }, {}),
      point(501, { ...base, tree_size: 65536, version: "9.0.0" }, {}),
    ];
    const kept = applyFilters(future, [{ field: "version", op: "latest", values: [] }]);
    expect(kept.every((p) => String(p.core.version) === "10.0.0")).toBe(true);
  });

  test("a panel key groups charts into panels", () => {
    const withPanels = buildPanels(points, { ...spec, panelKey: "axis" });
    expect(withPanels).toHaveLength(1);
    expect(withPanels[0]?.identity).toEqual({ axis: "f64" });
    expect(withPanels[0]?.charts).toHaveLength(2);
  });

  test("extension tags work as fields (kiddo.bucket)", () => {
    const byBucket = buildPanels(points, {
      ...spec,
      filters: [
        { field: "axis", op: "eq", values: ["f64"] },
        { field: "query", op: "eq", values: ["exact_nn"] },
      ],
      chartKey: "kiddo.bucket",
      seriesKeys: ["impl", "version"],
    });
    const panel = byPanels(byBucket)[0]!;
    expect(panel.charts.find((c) => c.identity["kiddo.bucket"] === "32")).toBeDefined();
  });

  test("x order is numeric for tree sizes", () => {
    const panel = buildPanels(points, spec)[0]!;
    const uniform = panel.charts.find((c) => c.identity.dataset === "uniform");
    const v6 = uniform?.series.find((s) => s.identity.version === "6.3.0");
    expect(v6?.points.map((p) => p.x)).toEqual([65536, 131072, 262144]);
  });
});

function byPanels(panels: Panel[]): Panel[] {
  return panels;
}
