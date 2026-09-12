import { useMemo, useState } from "react";
import { distinctValues } from "../engine/group";
import type { ChartSpec, Field, ResolvedPoint, XField, YField } from "../engine/model";

export interface SpecEditorProps {
  spec: ChartSpec;
  onChange: (spec: ChartSpec) => void;
  points: ResolvedPoint[];
}

/** Fields the UI offers for grouping/series/filters. */
export function fieldOptions(points: ResolvedPoint[]): Field[] {
  const core: Field[] = [
    "machine_hash",
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
}: SpecEditorProps): React.ReactElement {
  const fields = useMemo(() => fieldOptions(points), [points]);
  const [pending, setPending] = useState<Record<string, Field | string[] | undefined>>(
    {},
  );

  const set = (patch: Partial<ChartSpec>): void => onChange({ ...spec, ...patch });

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

  /** One channel: its source fields as chips, plus a dropdown + add. */
  const channelSection = (
    channel: keyof ChartSpec["channels"],
    label?: string,
  ): React.ReactElement => {
    const fields = spec.channels[channel] ?? [];
    const pendingField = pending[channel] as Field | undefined;
    const options = fields.filter((f) => !spec.seriesKeys.includes(f));
    return (
      <div className="mb-1">
        <span className={LABEL}>
          {label ?? channel}
          {fields.length > 0 && (
            <span className="ml-1 text-zinc-500">({fields.join(" + ")})</span>
          )}
        </span>
        {fields.length > 0 && (
          <ul className="mb-2 space-y-1">
            {fields.map((field) => (
              <li
                key={field}
                className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                <span>{field}</span>
                <button
                  type="button"
                  aria-label={`remove ${field}`}
                  className="px-1 text-zinc-500 hover:text-red-400"
                  onClick={() => {
                    const next = fields.filter((f) => f !== field);
                    set({ channels: { ...spec.channels, [channel]: next } });
                  }}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <select
            className={SELECT}
            value={pendingField ?? ""}
            onChange={(event) =>
              setPending({
                ...pending,
                [channel]: event.target.value === "" ? undefined : event.target.value,
              })
            }
          >
            <option value="">choose a param…</option>
            {options.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="shrink-0 rounded border border-blue-500 bg-blue-500/20 px-3 py-1.5 text-xs text-blue-300 disabled:opacity-40"
            disabled={pendingField === undefined}
            onClick={() => {
              if (pendingField === undefined || fields.includes(pendingField)) {
                return;
              }
              set({
                channels: {
                  ...spec.channels,
                  [channel]: [...fields, pendingField],
                },
              });
              setPending({ ...pending, [channel]: undefined });
            }}
          >
            add
          </button>
        </div>
      </div>
    );
  };

  /** The series source list: chips with remove buttons, plus an add row. */
  const seriesSection = (): React.ReactElement => {
    const [pending, setPending] = useState<Field | undefined>(undefined);
    const addable = fields.filter((f) => !spec.seriesKeys.includes(f));
    return (
      <div className="mb-4">
        <span className={LABEL}>series (each combination becomes a line)</span>
        {spec.seriesKeys.length > 0 && (
          <ul className="mb-2 space-y-1">
            {spec.seriesKeys.map((key) => (
              <li
                key={key}
                className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                <span>{key}</span>
                <button
                  type="button"
                  aria-label={`remove ${key}`}
                  className="px-1 text-zinc-500 hover:text-red-400"
                  onClick={() => {
                    const keys = spec.seriesKeys.filter((k) => k !== key);
                    set({
                      seriesKeys: keys,
                      channels: pruneChannels(spec.channels, keys),
                    });
                  }}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <select
            className={SELECT}
            value={pending ?? ""}
            onChange={(event) =>
              setPending(event.target.value === "" ? undefined : event.target.value)
            }
          >
            <option value="">choose a param…</option>
            {addable.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="shrink-0 rounded border border-blue-500 bg-blue-500/20 px-3 py-1.5 text-xs text-blue-300 disabled:opacity-40"
            disabled={pending === undefined}
            onClick={() => {
              if (pending === undefined || spec.seriesKeys.includes(pending)) {
                return;
              }
              set({ seriesKeys: [...spec.seriesKeys, pending] });
              setPending(undefined);
            }}
          >
            add
          </button>
        </div>
      </div>
    );
  };

  /** The filters group: chips of applied filters, plus add-field/values/add. */
  const filtersSection = (): React.ReactElement => {
    const pendingField = pending["__filter"] as Field | undefined;
    const filteredFields = new Set(spec.filters.map((f) => f.field));
    const addable = fields.filter((f) => !filteredFields.has(f));
    const isVersion = pendingField === "version";
    const pendingValues = pending["__filter_values"] as string[] | undefined;

    return (
      <div className="mb-4">
        <span className={LABEL}>filters</span>
        {spec.filters.length > 0 && (
          <ul className="mb-2 space-y-1">
            {spec.filters.map((filter) => (
              <li
                key={filter.field}
                className="flex items-center justify-between rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                <span className="truncate">
                  {filter.field}:{" "}
                  {filter.op === "latest"
                    ? "latest"
                    : filter.values.join(", ") || "all"}
                </span>
                <button
                  type="button"
                  aria-label={`remove ${filter.field}`}
                  className="px-1 text-zinc-500 hover:text-red-400"
                  onClick={() => {
                    set({
                      filters: spec.filters.filter((f) => f.field !== filter.field),
                    });
                  }}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2">
          <select
            className={SELECT}
            value={pendingField ?? ""}
            onChange={(event) => {
              const field = event.target.value;
              setPending({
                ...pending,
                __filter: field === "" ? undefined : field,
                __filter_values: [],
              });
            }}
          >
            <option value="">choose a dimension…</option>
            {addable.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          {pendingField !== undefined &&
            (isVersion ? (
              <select
                className={SELECT}
                value={pendingValues?.[0] ?? ""}
                onChange={(event) =>
                  setPending({
                    ...pending,
                    __filter_values:
                      event.target.value === "" ? [] : [event.target.value],
                  })
                }
              >
                <option value="">choose…</option>
                <option value="latest">latest (per library)</option>
              </select>
            ) : (
              <select
                multiple
                className={`${SELECT} h-24`}
                value={pendingValues ?? []}
                onChange={(event) =>
                  setPending({
                    ...pending,
                    __filter_values: [...event.target.selectedOptions].map(
                      (option) => option.value,
                    ),
                  })
                }
              >
                {distinctValues(points, pendingField).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ))}
          <button
            type="button"
            className="rounded border border-blue-500 bg-blue-500/20 px-3 py-1.5 text-xs text-blue-300 disabled:opacity-40"
            disabled={
              pendingField === undefined ||
              (isVersion
                ? pendingValues?.[0] === undefined
                : (pendingValues?.length ?? 0) === 0)
            }
            onClick={() => {
              if (pendingField === undefined) return;
              if (isVersion) {
                set({
                  filters: [
                    ...spec.filters,
                    { field: pendingField, op: "latest", values: [] },
                  ],
                });
              } else {
                const values = pendingValues ?? [];
                if (values.length === 0) return;
                set({
                  filters: [
                    ...spec.filters,
                    {
                      field: pendingField,
                      op: values.length === 1 ? "eq" : "in",
                      values,
                    },
                  ],
                });
              }
              setPending({
                __filter: undefined,
                __filter_values: undefined,
              });
            }}
          >
            add filter
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {filtersSection()}

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

      {seriesSection()}

      <div className="mb-4">
        <span className={LABEL}>channels (each value combination gets its own)</span>
        <div className="grid grid-cols-1 gap-3">
          {channelSection("colour")}
          {channelSection("brightness")}
          {channelSection("lineStyle", "line style")}
          {channelSection("marker")}
          {channelSection("width", "line width")}
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

      <div className="mb-3">
        <span className={LABEL}>y scale</span>
        <div className="flex gap-2">
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
      </div>

      <div className="mb-4">
        <span className={LABEL}>x scale</span>
        <div className="flex gap-2">
          <button
            type="button"
            className={spec.xScale === "log" ? ACTIVE : INACTIVE}
            onClick={() => set({ xScale: "log" })}
          >
            log2
          </button>
          <button
            type="button"
            className={spec.xScale === "linear" ? ACTIVE : INACTIVE}
            onClick={() => set({ xScale: "linear" })}
          >
            linear
          </button>
        </div>
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
  for (const key of Object.keys(channels) as (keyof ChartSpec["channels"])[]) {
    const fields = channels[key];
    if (fields && fields.some((f) => kept.has(f))) out[key] = fields;
  }
  return out;
}
