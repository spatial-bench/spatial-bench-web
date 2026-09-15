// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import { featuredCharts, snapshot } from "./data/featured";
import { specFromQuery } from "./engine/url";
import worker from "./worker";

const home = readFileSync("src/pages/index.astro", "utf8");
const script = home.match(/<script is:inline>([\s\S]*?)<\/script>/)![1]!;

describe("static landing compatibility", () => {
  test("legacy root links preserve the entire query and fragment", () => {
    const replace = vi.fn();
    const location = { search: "?spec=abc&other=1", hash: "#point", replace };
    document.body.innerHTML =
      "<figure data-featured></figure><figure data-featured hidden></figure>";
    new Function("location", "document", "Math", script)(location, document, {
      random: () => 0.9,
      floor: Math.floor,
    });
    expect(replace).toHaveBeenCalledWith("/explore?spec=abc&other=1#point");
    expect([...document.querySelectorAll("figure")].map((f) => f.hidden)).toEqual([
      true,
      false,
    ]);
  });
  test("ordinary home URLs stay home and either chart can be selected", () => {
    const replace = vi.fn();
    document.body.innerHTML =
      "<figure data-featured></figure><figure data-featured hidden></figure>";
    new Function("location", "document", "Math", script)(
      { search: "?utm_source=test", hash: "", replace },
      document,
      { random: () => 0, floor: Math.floor },
    );
    expect(replace).not.toHaveBeenCalled();
    expect([...document.querySelectorAll("figure")].map((f) => f.hidden)).toEqual([
      false,
      true,
    ]);
  });
  test("featured URLs round-trip their controlled workload", () => {
    for (const { href, spec, chart } of featuredCharts) {
      expect(specFromQuery(href.split("?")[1]!, spec)).toEqual(spec);
      expect(chart.series).toHaveLength(3);
      expect(chart.series.every((s) => s.points.length === 9)).toBe(true);
      expect(
        chart.series.every((s) =>
          s.points.every((p) => p.y > 0 && p.point.core.metric === "squared_euclidean"),
        ),
      ).toBe(true);
    }
    expect(Object.keys(snapshot.sources)).toHaveLength(6);
  });
});

test("Worker proxies data and delegates document and missing routes to static assets", async () => {
  const get = vi.fn().mockResolvedValue(null);
  const fetch = vi.fn().mockResolvedValue(new Response("static"));
  const env = { DATASET: { get }, ASSETS: { fetch } };
  for (const path of ["/guide", "/explore?spec=abc", "/missing"]) {
    await worker.fetch(new Request(`https://spatial-bench.org${path}`), env);
  }
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(
    (await worker.fetch(new Request("https://spatial-bench.org/data/latest.json"), env))
      .status,
  ).toBe(404);
  expect(get).toHaveBeenCalledWith("latest.json");
  const config = readFileSync("wrangler.jsonc", "utf8");
  expect(config).toContain('"not_found_handling": "404-page"');
  expect(config).toContain('"run_worker_first": ["/data/*"]');
});
