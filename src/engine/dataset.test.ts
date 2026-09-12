import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { type DatasetDb, loadDataset, openInMemory } from "./dataset";
import { buildPanels, distinctValues } from "./group";
import type { ChartSpec, ResolvedPoint } from "./model";

/**
 * Integration: the real published fixture (built by `spatial-bench publish`
 * from the results repo) loaded through the actual wasm sqlite, in Node.
 * Opening + querying works in Node, which is enough to test the loader's
 * query logic and the engine's consumption of it.
 */

let db: DatasetDb;
let points: ResolvedPoint[];
let machines: string[];

beforeAll(async () => {
  const bytes = new Uint8Array(readFileSync(".fixture/benchmarks-test.sqlite"));
  db = await openInMemory(bytes);
  ({ points, machines } = await loadDataset(db));
}, 30_000);

describe("the dataset loader against a real collated snapshot", () => {
  test("every point row resolves", () => {
    expect(points.length).toBeGreaterThan(400);
  });

  test("machines come through", () => {
    expect(machines).toContain("anxrmnkpfa-qxmvv");
  });

  test("core columns land in the point's core record", () => {
    const kiddo = points.find((p) => p.core.impl === "kiddo");
    expect(kiddo).toBeDefined();
    expect(["5.3.3", "6.3.0"]).toContain(String(kiddo?.core.version));
    expect(kiddo?.core.query).toBe("exact_nn");
    expect(typeof kiddo?.core.tree_size).toBe("number");
  });

  test("extension tags land in the point's tags record", () => {
    const withStem = points.find((p) => p.tags["kiddo.stem"]);
    expect(withStem?.tags["kiddo.stem"]).toBe("eytzinger");
  });

  test("both kiddo versions are present, from one impl", () => {
    const versions = new Set(
      points.filter((p) => p.core.impl === "kiddo").map((p) => String(p.core.version)),
    );
    expect(versions.has("5.3.3")).toBe(true);
    expect(versions.has("6.3.0")).toBe(true);
  });

  test("the grouping engine consumes loaded points directly", () => {
    const spec: ChartSpec = {
      filters: [
        { field: "impl", op: "eq", values: ["kiddo"] },
        { field: "query", op: "eq", values: ["exact_nn"] },
        { field: "config", op: "eq", values: ["default"] },
      ],
      chartKey: "dataset",
      seriesKeys: ["version"],
      channels: { colour: ["version"] },
      x: "tree_size",
      y: "latency_ns",
      xScale: "linear",
      yScale: "log",
      dedupe: "latest",
    };
    const panels = buildPanels(points, spec);
    const uniform = panels[0]?.charts.find((c) => c.identity.dataset === "uniform");
    const versions = uniform?.series.map((s) => s.identity.version).sort();
    expect(versions).toEqual(["5.3.3", "6.3.0"]);
  });

  test("distinctValues feeds dropdowns from loaded data", () => {
    expect(distinctValues(points, "machine_hash")).toEqual(["anxrmnkpfa-qxmvv"]);
  });
});
