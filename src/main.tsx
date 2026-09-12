import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BenchChart } from "./components/BenchChart";
import { SpecEditor } from "./components/SpecEditor";
import type { SeriesStyle } from "./engine/group";
import { assignStyles, buildPanels } from "./engine/group";
import type { Chart, ChartSpec, ResolvedPoint } from "./engine/model";
import { pushSpecToUrl, specFromQuery } from "./engine/url";
import { useContainerWidth } from "./hooks/useContainerWidth";
import { DATASET_BASE, useDataset } from "./hooks/useDataset";

const queryClient = new QueryClient();

const DEFAULT_SPEC: ChartSpec = {
  filters: [{ field: "config", op: "eq", values: ["default"] }],
  chartKey: "axis",
  seriesKeys: ["version", "parallelism"],
  channels: { colour: ["version"], lineStyle: ["parallelism"] },
  x: "tree_size",
  y: "latency_ns",
  xScale: "log",
  yScale: "log",
  dedupe: "latest",
  panelKey: "query",
};

/** The spec, hydrated from the URL when one is present. */
function useSpec(machines: string[]): {
  spec: ChartSpec;
  setSpec: (spec: ChartSpec) => void;
} {
  const [spec, setSpecState] = useState<ChartSpec>(() =>
    specFromQuery(window.location.search, DEFAULT_SPEC),
  );

  // The machine filter defaults to the machine(s) present, once.
  useEffect(() => {
    const hasMachine = spec.filters.some((f) => f.field === "machine_hash");
    if (machines.length === 0 || hasMachine) return;
    setSpecState({
      ...spec,
      filters: [
        ...spec.filters,
        { field: "machine_hash", op: "in", values: machines.slice(0, 1) },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines.join(",")]);

  const setSpec = (next: ChartSpec): void => {
    setSpecState(next);
    pushSpecToUrl(next);
  };
  return { spec, setSpec };
}

function panelTitle(identity: Record<string, string>): string {
  return (
    Object.entries(identity)
      .map(
        ([field, value]) =>
          `${field
            .replace(/^[a-z]/, (c) => c.toUpperCase())
            .replace(/_/g, " ")}: ${value}`,
      )
      .join(" · ") || "results"
  );
}

function identityLabel(identity: Record<string, string>): string {
  const entries = Object.entries(identity);
  return entries.map(([key, value]) => `${key}=${value}`).join(", ") || "all";
}

function ChartLegend(props: {
  wrapper: { chart: Chart; styles: SeriesStyle[] };
  spec: ChartSpec;
}): React.ReactElement {
  const { wrapper, spec } = props;
  const { chart, styles } = wrapper;
  if (chart.series.length === 0) return <></>;
  const channelKeys = [
    ...(spec.channels.colour ?? []),
    ...(spec.channels.brightness ?? []),
    ...(spec.channels.lineStyle ?? []),
    ...(spec.channels.marker ?? []),
    ...(spec.channels.width ?? []),
  ];
  return (
    <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {chart.series.map((series, index) => {
        const style = styles[index] ?? {
          colour: "#60a5fa",
          brightness: 0,
          dash: "",
        };
        return (
          <span
            key={identityLabel(series.identity)}
            className="flex items-center gap-1.5"
          >
            <svg width={18} height={10}>
              <line
                x1={0}
                y1={5}
                x2={18}
                y2={5}
                stroke={style.colour}
                strokeWidth={2}
                strokeDasharray={style.dash || undefined}
                opacity={[1, 0.7, 0.45, 0.3][style.brightness] ?? 1}
              />
            </svg>
            {channelKeys
              .map((key) => `${key}: ${series.identity[key] ?? "?"}`)
              .join(" · ") || identityLabel(series.identity)}
          </span>
        );
      })}
    </div>
  );
}

function PointDetail({ point }: { point: ResolvedPoint }): React.ReactElement {
  const core = Object.entries(point.core);
  const tags = Object.entries(point.tags);
  return (
    <aside className="w-80 shrink-0 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">point detail</h2>
        <span className="font-mono text-xs text-zinc-500">#{point.id}</span>
      </div>
      <dl className="mb-4 space-y-1">
        <dt className="text-xs text-zinc-500">latency (median)</dt>
        <dd className="font-mono">{point.medianNs ?? point.latencyNs} ns</dd>
        <dt className="text-xs text-zinc-500">confidence</dt>
        <dd className="font-mono text-xs">
          [{point.latencyLower ?? "?"}, {point.latencyUpper ?? "?"}]
        </dd>
        <dt className="text-xs text-zinc-500">mad / stddev</dt>
        <dd className="font-mono text-xs">
          {point.madNs ?? "?"} / {point.stdDevNs ?? "?"}
        </dd>
        <dt className="text-xs text-zinc-500">samples</dt>
        <dd>{point.samples ?? "?"}</dd>
        <dt className="text-xs text-zinc-500">run</dt>
        <dd className="truncate font-mono text-xs" title={point.runId}>
          {point.runId}
        </dd>
        <dt className="text-xs text-zinc-500">measured</dt>
        <dd className="text-xs">{point.startedAt}</dd>
      </dl>
      <h3 className="mb-1 text-xs font-semibold text-zinc-400">core</h3>
      <dl className="mb-4 space-y-0.5 font-mono text-xs">
        {core.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <dt className="text-zinc-500">{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
      {tags.length > 0 && (
        <>
          <h3 className="mb-1 text-xs font-semibold text-zinc-400">tags</h3>
          <dl className="space-y-0.5 font-mono text-xs">
            {tags.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-zinc-500">{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </aside>
  );
}

function Explorer(): React.ReactElement {
  const query = useDataset();
  const [selected, setSelected] = useState<ResolvedPoint | null>(null);

  const machines = query.data?.dataset.machines ?? [];
  const points = query.data?.dataset.points ?? [];
  const { spec, setSpec } = useSpec(machines);

  const panels = useMemo(() => {
    if (points.length === 0) return [];
    const built = buildPanels(points, spec);
    return built.map((panel) => ({
      identity: panel.identity,
      charts: panel.charts.map((chart) => ({
        chart,
        styles: assignStyles(chart.series, spec),
      })),
    }));
  }, [points, spec]);

  useEffect(() => {
    pushSpecToUrl(spec);
  }, [spec]);

  // Hooks stay unconditional: the chart area's measured width is needed in
  // every render, loading or not.
  const { ref: chartsRef, width: chartWidth } = useContainerWidth(760);
  // Taller charts earn their space on desktop; mobile keeps them compact.
  const chartHeight = chartWidth > 560 ? 320 : 260;

  if (query.isPending) {
    return <p className="p-8 text-zinc-400">loading dataset…</p>;
  }
  if (query.isError) {
    return (
      <p className="p-8 text-red-400">
        dataset unreachable at <code>{DATASET_BASE}/latest.json</code>:{" "}
        {String(query.error)}
      </p>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4">
          <h1 className="text-lg font-semibold">spatial-bench</h1>
          <span className="truncate text-xs text-zinc-500">
            {machines.length === 1
              ? `machine: ${machines[0]}`
              : `${machines.length} machines`}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <details open className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-zinc-300">
            chart controls
          </summary>
          <div className="px-4 pb-4 pt-1 sm:columns-2 lg:columns-3 [&>div]:break-inside-avoid">
            <SpecEditor
              spec={spec}
              onChange={setSpec}
              points={points}
              machines={machines}
            />
          </div>
        </details>

        <div ref={chartsRef}>
          {panels.length === 0 && (
            <p className="text-zinc-500">
              the current filters match no points — loosen something
            </p>
          )}
          {panels.map((panel) => (
            <details
              key={identityLabel(panel.identity)}
              open
              className="group mb-8 border-t border-zinc-800 pt-4 first:border-t-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between py-2">
                <h2 className="text-base font-semibold text-zinc-100">
                  {panelTitle(panel.identity)}
                </h2>
                <span className="text-xs text-zinc-500 group-open:hidden">show</span>
                <span className="hidden text-xs text-zinc-500 group-open:inline">
                  hide
                </span>
              </summary>
              <div className="flex flex-col gap-6">
                {panel.charts.map((styled) => (
                  <div
                    key={identityLabel(styled.chart.identity)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                  >
                    <h3 className="mb-1 text-xs font-medium text-zinc-300">
                      {panelTitle(styled.chart.identity)}
                    </h3>
                    <ChartLegend wrapper={styled} spec={spec} />
                    <BenchChart
                      chart={styled.chart}
                      spec={spec}
                      styles={styled.styles}
                      width={chartWidth}
                      height={chartHeight}
                      selected={selected}
                      onSelect={setSelected}
                    />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
      {selected && (
        <div className="fixed inset-x-2 top-16 z-20 max-w-sm mx-auto shadow-2xl sm:inset-x-4 sm:left-auto sm:right-4 sm:top-20">
          <PointDetail point={selected} />
          <button
            type="button"
            className="mt-2 w-full rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400"
            onClick={() => setSelected(null)}
          >
            close
          </button>
        </div>
      )}
    </div>
  );
}

export default function App(): React.ReactElement {
  return <Explorer />;
}

createRoot(document.getElementById("root") ?? document.body).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
