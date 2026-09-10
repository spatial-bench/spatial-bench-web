import { useMemo } from "react";
import { distinctValues } from "../engine/group";
import type { ChartSpec, Field, ResolvedPoint, XField, YField } from "../engine/model";

export interface SpecEditorProps {
  spec: ChartSpec;
  onChange: (spec: ChartSpec) => void;
  points: ResolvedPoint[];
  machines: string[];
}

/** Fields the UI offers for grouping/series/filters. */
export function fieldOptions(points: ResolvedPoint[]): Field[] {
  const core: Field[] = [
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
    "query_count",
  ];
  const tags = new Set<Field>();
  for (const point of points) {
    for (const key of Object.keys(point.tags)) tags.add(key);
  }
  return [...core, ...tags];
}

const LABEL = "mb-1 block text-xs font-medium text-zinc-400";
const SELECT =
  "w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100";
const ACTIVE =
  "flex-1 rounded border border-blue-500 bg-blue-500/20 px-2 py-1.5 text-xs text-blue-300";
const INACTIVE =
  "flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-400";

/** The spec editor: filters, grouping keys, series, channels, axes, scale. */
export function SpecEditor({
  spec,
  onChange,
  points,
  machines,
}: SpecEditorProps): React.ReactElement {
  const fields = useMemo(() => fieldOptions(points), [points]);

  const set = (patch: Partial<ChartSpec>): void => onChange({ ...spec, ...patch });

  /** The machine dropdown — a mandatory dimension, one machine at a time. */
  const machineSelect: React.ReactElement = (
    <div className="mb-4">
      <span className={LABEL}>machine (fingerprint)</span>
      <select
        className={SELECT}
        value={spec.filters.find((f) => f.field === "machine_hash")?.values[0] ?? ""}
        onChange={(event) => {
          const machine = event.target.value;
          const filters = spec.filters.filter((f) => f.field !== "machine_hash");
          if (machine !== "") {
            filters.push({ field: "machine_hash", op: "in", values: [machine] });
          }
          set({ filters });
        }}
      >
        <option value="">all machines</option>
        {machines.map((machine) => (
          <option key={machine} value={machine}>
            {machine}
          </option>
        ))}
      </select>
    </div>
  );

  /** A single-value quick filter: "all" clears that dimension's filter. */
  const quickFilter = (field: Field, label: string): React.ReactElement => {
    const values = distinctValues(points, field);
    const current = spec.filters.find((f) => f.field === field);
    return (
      <div className="mb-4">
        <span className={LABEL}>{label}</span>
        <select
          className={SELECT}
          value={current?.values[0] ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            const filters = spec.filters.filter((f) => f.field !== field);
            if (value !== "") {
              filters.push({ field, op: "eq", values: [value] });
            }
            set({ filters });
          }}
        >
          <option value="">all</option>
          {values.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const fieldSelect = (
    label: string,
    value: Field | undefined,
    onPick: (field: Field | undefined) => void,
    allowNone: boolean,
  ): React.ReactElement => (
    <div className="mb-4">
      <span className={LABEL}>{label}</span>
      <select
        className={SELECT}
        value={value ?? ""}
        onChange={(event) =>
          onPick(event.target.value === "" ? undefined : event.target.value)
        }
      >
        {allowNone && <option value="">(none)</option>}
        {fields.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </div>
  );

  const seriesAt = (index: number): Field | undefined => spec.seriesKeys[index];

  const setSeries = (index: number, field: Field | undefined): void => {
    const keys = [...spec.seriesKeys];
    if (field === undefined) keys.splice(index, 1);
    else keys[index] = field;
    set({
      seriesKeys: keys,
      channels: pruneChannels(spec.channels, keys),
    });
  };

  const channelSelect = (
    label: string,
    channel: "colour" | "brightness" | "lineStyle",
  ): React.ReactElement => (
    <div>
      <span className={LABEL}>{label}</span>
      <select
        className={SELECT}
        value={spec.channels[channel] ?? ""}
        onChange={(event) => {
          const field = event.target.value === "" ? undefined : event.target.value;
          set({ channels: { ...spec.channels, [channel]: field } });
        }}
      >
        <option value="">(none)</option>
        {spec.seriesKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      {machineSelect}

      {quickFilter("impl", "library")}
      {quickFilter("version", "version")}
      {quickFilter("query", "query")}
      {quickFilter("axis", "scalar axis")}
      {quickFilter("dataset", "dataset")}
      {quickFilter("config", "config")}

      <div className="mb-4">
        <span className={LABEL}>panel key (group charts)</span>
        {fieldSelect(
          "panel key",
          spec.panelKey,
          (field) => set({ panelKey: field }),
          true,
        )}
      </div>

      <div className="mb-4">
        <span className={LABEL}>chart key (one chart per value)</span>
        {fieldSelect(
          "chart key",
          spec.chartKey,
          (field) => {
            if (field !== undefined) set({ chartKey: field });
          },
          false,
        )}
      </div>

      {[0, 1].map((index) => (
        <div className="mb-4" key={index}>
          <span className={LABEL}>{index === 0 ? "series" : "series 2"}</span>
          <select
            className={SELECT}
            value={seriesAt(index) ?? ""}
            onChange={(event) =>
              setSeries(
                index,
                event.target.value === "" ? undefined : event.target.value,
              )
            }
          >
            <option value="">(none)</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </div>
      ))}

      <div className="mb-4">
        <span className={LABEL}>channels</span>
        <div className="grid grid-cols-1 gap-2">
          {channelSelect("colour", "colour")}
          {channelSelect("brightness", "brightness")}
          {channelSelect("line style", "lineStyle")}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <span className={LABEL}>y axis</span>
          <select
            className={SELECT}
            value={spec.y}
            onChange={(event) => set({ y: event.target.value as YField })}
          >
            <option value="latency_ns">latency</option>
            <option value="throughput_qps">throughput</option>
          </select>
        </div>
        <div>
          <span className={LABEL}>x axis</span>
          <select
            className={SELECT}
            value={spec.x}
            onChange={(event) => set({ x: event.target.value as XField })}
          >
            <option value="tree_size">tree size</option>
            <option value="version">version</option>
            <option value="started_at">run date</option>
          </select>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className={spec.yScale === "log" ? ACTIVE : INACTIVE}
          onClick={() => set({ yScale: "log" })}
        >
          log
        </button>
        <button
          type="button"
          className={spec.yScale === "linear" ? ACTIVE : INACTIVE}
          onClick={() => set({ yScale: "linear" })}
        >
          linear
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => set({ dedupe: "latest" })}
          className={spec.dedupe === "latest" ? ACTIVE : INACTIVE}
        >
          latest run
        </button>
        <button
          type="button"
          onClick={() => set({ dedupe: "median" })}
          className={spec.dedupe === "median" ? ACTIVE : INACTIVE}
        >
          best (median)
        </button>
      </div>
    </div>
  );
}

/** Channels must reference series keys; drop any that fell away. */
function pruneChannels(
  channels: ChartSpec["channels"],
  keys: Field[],
): ChartSpec["channels"] {
  const kept = new Set(keys);
  const out: ChartSpec["channels"] = {};
  if (channels.colour && kept.has(channels.colour)) out.colour = channels.colour;
  if (channels.brightness && kept.has(channels.brightness)) {
    out.brightness = channels.brightness;
  }
  if (channels.lineStyle && kept.has(channels.lineStyle)) {
    out.lineStyle = channels.lineStyle;
  }
  return out;
}
