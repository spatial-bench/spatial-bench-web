// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { beforeAll, describe, expect, test } from "vitest";
import { loadDataset, openInMemory } from "../engine/dataset";
import { assignStyles, buildPanels } from "../engine/group";
import type { ChartSpec, ResolvedPoint } from "../engine/model";
import { BenchChart } from "./BenchChart";

/**
 * Renders the real component against the real collated snapshot and asserts
 * the axis ticks span the data — the guard for the linear-pad-on-a-log-axis
 * bug, where the x domain's padded lower bound went negative and the log
 * scale clamped to MIN_VALUE, spanning a thousand dead decades (the
 * 2^-1000…2^0 tick pileup).
 */

let points: ResolvedPoint[];

beforeAll(async () => {
  const bytes = new Uint8Array(readFileSync(".fixture/benchmarks-test.sqlite"));
  const db = await openInMemory(bytes);
  ({ points } = await loadDataset(db));
}, 30_000);

describe("BenchChart rendered against the live snapshot", () => {
  test("x axis ticks span the data domain at load (log2 x)", async () => {
    const spec: ChartSpec = {
      filters: [],
      panelKey: "query",
      chartKey: "axis",
      seriesKeys: ["version", "parallelism"],
      channels: { colour: ["impl"], brightness: ["version"] },
      x: "tree_size",
      y: "latency_ns",
      xScale: "log",
      yScale: "log",
      dedupe: "latest",
    };
    const panels = buildPanels(points, spec);
    const bnw = panels.find((p) => p.identity.query === "best_n_within")!;
    const f32 = bnw.charts.find((c) => c.identity.axis === "f32")!;
    const styles = assignStyles(f32.series, spec);
    const { container } = render(
      <svg>
        <BenchChart
          chart={f32}
          spec={spec}
          styles={styles}
          width={560}
          height={320}
          selected={null}
          onSelect={() => {}}
        />
      </svg>,
    );
    const labels = [...container.querySelectorAll("text")].map(
      (t) => t.textContent ?? "",
    );
    console.log("TICK LABELS:", JSON.stringify(labels));
    // The x axis must reach the data's largest tree size, not the log
    // scale's degenerate floor.
    expect(labels.some((l) => l === "2^24" || l === "16M")).toBe(true);
    // And must not contain the degenerate negative decades.
    expect(labels.some((l) => l?.startsWith("2^-"))).toBe(false);
  });
});
