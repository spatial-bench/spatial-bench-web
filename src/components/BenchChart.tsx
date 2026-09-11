import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear, scaleLog } from "@visx/scale";
import { LinePath } from "@visx/shape";
import type { NumberValue } from "d3-scale";
import { useMemo, useRef, useState } from "react";
import type { SeriesStyle } from "../engine/group";
import type { Chart, ChartSpec, ResolvedPoint } from "../engine/model";

export interface BenchChartProps {
  chart: Chart;
  spec: ChartSpec;
  styles: SeriesStyle[];
  width: number;
  height: number;
  selected: ResolvedPoint | null;
  onSelect: (point: ResolvedPoint | null) => void;
}

const MARGIN = { top: 12, right: 16, bottom: 36, left: 70 };
const BRIGHTNESS_OPACITY = [1, 0.7, 0.45, 0.3];

/**
 * A single chart: axes, one polyline per series, hover highlight, and
 * selectable points. Zoom is domain zoom (wheel about the cursor, drag to
 * pan, double-click resets) so axes re-tick correctly on linear and log.
 */
export function BenchChart({
  chart,
  spec,
  styles,
  width,
  height,
  selected,
  onSelect,
}: BenchChartProps) {
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const fullDomain = useMemo(
    () => fullXDomain(chart, spec.xScale),
    [chart, spec.xScale],
  );
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const dragRef = useRef<{ px: number; domain: [number, number] } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const xDomain: [number, number] = zoom ? [zoom.x0, zoom.x1] : fullDomain;
  const span = xDomain[1] - xDomain[0];
  const yBounds = useMemo(() => yBoundsOf(chart), [chart]);

  const xScale = useMemo(
    () =>
      spec.xScale === "log"
        ? scaleLog({
            base: 2,
            domain: [Math.max(xDomain[0], Number.MIN_VALUE), xDomain[1]],
            range: [0, innerWidth],
            clamp: true,
          })
        : scaleLinear({ domain: xDomain, range: [0, innerWidth], clamp: true }),
    [xDomain, innerWidth, spec.xScale],
  );
  const yScale = useMemo(
    () =>
      spec.yScale === "log"
        ? scaleLog({
            domain: [Math.max(yBounds[0], Number.MIN_VALUE), yBounds[1]],
            range: [innerHeight, 0],
            clamp: true,
          })
        : scaleLinear({
            domain: [0, yBounds[1] * 1.08],
            range: [innerHeight, 0],
          }),
    [yBounds, innerHeight, innerWidth, spec.yScale],
  );

  const onPointerDown = (event: React.PointerEvent): void => {
    if (event.button === 0)
      dragRef.current = { px: event.clientX, domain: [xDomain[0], xDomain[1]] };
  };

  const onPointerMove = (event: React.PointerEvent): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.px) * (span / innerWidth);
    setZoom(clampDomain(drag.domain[0] - dx, drag.domain[1] - dx, fullDomain));
  };

  const onPointerUp = (): void => {
    dragRef.current = null;
  };

  const bindWheel = (svg: SVGSVGElement | null): void => {
    if (!svg || svg.dataset.wheelBound === "true") return;
    svg.dataset.wheelBound = "true";
    svg.addEventListener(
      "wheel",
      (event) => {
        // Only pinch gestures (wheel + ctrlKey) zoom; a plain two-finger
        // scroll must keep scrolling the page.
        if (!event.ctrlKey) return;
        event.preventDefault();
        const rect = svg.getBoundingClientRect();
        const frac = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left - MARGIN.left) / innerWidth),
        );
        const anchor = xDomain[0] + (xDomain[1] - xDomain[0]) * frac;
        const factor = event.deltaY < 0 ? 0.85 : 1 / 0.85;
        const newSpan = Math.max(
          (fullDomain[1] - fullDomain[0]) * 0.01,
          (xDomain[1] - xDomain[0]) * factor,
        );
        setZoom({
          x0: anchor - newSpan * frac,
          x1: anchor + newSpan * (1 - frac),
        });
      },
      { passive: false },
    );
  };

  return (
    <svg
      ref={(node) => {
        svgRef.current = node;
        bindWheel(node);
      }}
      width={width}
      height={height}
      role="img"
      className="touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        onPointerUp();
        setHover(null);
      }}
      onDoubleClick={() => setZoom(null)}
      onClick={(event) => {
        if (event.target === svgRef.current) onSelect(null);
      }}
    >
      <Group left={MARGIN.left} top={MARGIN.top}>
        {chart.series.map((series, index) => {
          const style = styleAt(styles, index);
          return (
            <LinePath
              key={identityKey(series.identity)}
              data={series.points}
              x={(p) => xScale(Number(p.x))}
              y={(p) => yScale(p.y)}
              stroke={style.colour}
              strokeOpacity={BRIGHTNESS_OPACITY[style.brightness] ?? 1}
              strokeWidth={2}
              strokeDasharray={style.dash || undefined}
            />
          );
        })}
        {chart.series.map((series, index) =>
          series.points.map((p) => {
            const style = styleAt(styles, index);
            const cx = xScale(Number(p.x));
            const cy = yScale(p.y);
            if (cx < -1 || cx > innerWidth + 1 || cy < -1 || cy > innerHeight + 1)
              return null;
            const isSelected = selected?.id === p.point.id;
            return (
              <circle
                key={identityKey(series.identity) + "-" + String(p.point.id)}
                cx={cx}
                cy={cy}
                r={isSelected ? 5.5 : 3.5}
                fill={style.colour}
                opacity={(BRIGHTNESS_OPACITY[style.brightness] ?? 1) * 0.9}
                stroke={isSelected ? "#ffffff" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ x: cx, y: cy, point: p.point })}
                onMouseLeave={() => setHover(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(isSelected ? null : p.point);
                }}
              />
            );
          }),
        )}
        {hover && <HoverBadge hover={hover} innerWidth={innerWidth} />}
        <AxisBottom
          scale={xScale}
          top={innerHeight}
          numTicks={width > 500 ? 6 : 3}
          tickFormat={(v: NumberValue) => formatX(Number(v), spec)}
          label={axisLabel(spec.x)}
          tickLabelProps={() => ({
            fill: "#a1a1aa",
            fontSize: 10,
            textAnchor: "middle",
          })}
          labelProps={{ fill: "#a1a1aa", fontSize: 11 }}
        />
        <AxisLeft
          scale={yScale}
          tickValues={spec.yScale === "log" ? logTicks(yScale) : undefined}
          tickFormat={(v: NumberValue) => formatNs(Number(v))}
          tickLabelProps={() => ({ fill: "#a1a1aa", fontSize: 10, textAnchor: "end" })}
          label={axisLabel(spec.y)}
          labelProps={{ fill: "#a1a1aa", fontSize: 10 }}
        />
      </Group>
    </svg>
  );
}

interface Hover {
  x: number;
  y: number;
  point: ResolvedPoint;
}

interface Zoom {
  x0: number;
  x1: number;
}

function styleAt(styles: SeriesStyle[], index: number): SeriesStyle {
  return styles[index] ?? { colour: "#60a5fa", brightness: 0, dash: "" };
}

function identityKey(identity: Record<string, string>): string {
  return Object.values(identity).join("·") || "series";
}

function HoverBadge({
  hover,
  innerWidth,
}: {
  hover: Hover;
  innerWidth: number;
}): React.ReactElement {
  const value = hover.point.medianNs ?? hover.point.latencyNs;
  return (
    <g>
      <rect
        x={Math.min(hover.x + 10, innerWidth - 160)}
        y={Math.max(hover.y - 48, 0)}
        width={150}
        height={40}
        rx={4}
        fill="#18181b"
        stroke="#3f3f46"
      />
      <text
        x={Math.min(hover.x + 18, innerWidth - 152)}
        y={Math.max(hover.y - 22, 20)}
        fill="#fafafa"
        fontSize={11}
      >
        {formatNs(value)}
      </text>
      <text
        x={Math.min(hover.x + 18, innerWidth - 152)}
        y={Math.max(hover.y - 10, 32)}
        fill="#a1a1aa"
        fontSize={10}
      >
        {String(hover.point.core.impl)} {String(hover.point.core.version)}
      </text>
    </g>
  );
}

function axisLabel(field: string): string {
  if (field === "tree_size") return "points in tree";
  if (field === "latency_ns") return "latency (ns/query)";
  if (field === "throughput_qps") return "throughput (q/s)";
  return field;
}

/**
 * Log scales emit every mantissa (1..9 per decade), which crowds the axis.
 * Keep the 1/2/5 pattern.
 */
function logTicks(scale: { ticks: () => NumberValue[] | number[] }): number[] {
  return scale
    .ticks()
    .map(Number)
    .filter((v) => {
      if (v <= 0) return false;
      const exponent = Math.floor(Math.log10(v));
      const mantissa = Math.round(v / 10 ** exponent);
      return mantissa === 1 || mantissa === 2 || mantissa === 5;
    });
}

function formatNs(v: number): string {
  // SI units, rounded to whole numbers.
  if (v >= 1e6) return `${Math.round(v / 1e6)}ms`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}µs`;
  return `${Math.round(v)}ns`;
}

/** Tree sizes read as 2^N on a log2 x axis; everything else stays SI. */
function formatX(value: number, spec: ChartSpec): string {
  if (spec.x === "tree_size" && spec.xScale === "log" && value > 0) {
    const exponent = Math.log2(value);
    if (Math.abs(exponent - Math.round(exponent)) < 1e-9) {
      return `2^${Math.round(exponent)}`;
    }
  }
  return formatSI(value);
}

function formatSI(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}G`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)}k`;
  return String(value);
}

function fullXDomain(chart: Chart, scale: "log" | "linear"): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const series of chart.series) {
    for (const p of series.points) {
      if (typeof p.x === "number") {
        min = Math.min(min, p.x);
        max = Math.max(max, p.x);
      }
    }
  }
  if (!Number.isFinite(min)) return [1, 2];
  if (scale === "log") {
    // Pad in log space: a linear pad on a log axis pushes the lower bound
    // negative, and a log scale cannot cross zero — the scale would clamp
    // to MIN_VALUE and the axis would span a thousand dead decades.
    const logMin = Math.log2(Math.max(min, 1));
    const logMax = Math.log2(Math.max(max, logMin * 2));
    const pad = (logMax - logMin || 1) * 0.08;
    return [2 ** (logMin - pad), 2 ** (logMax + pad)];
  }
  const pad = (max - min || 1) * 0.04;
  return [min - pad, max + pad];
}

function yBoundsOf(chart: Chart): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const series of chart.series) {
    for (const p of series.points) {
      min = Math.min(min, p.y);
      max = Math.max(max, p.y);
    }
  }
  if (!Number.isFinite(min)) return [1, 10];
  return [min, max];
}

function clampDomain(x0: number, x1: number, full: [number, number]): Zoom {
  const wide = full[1] - full[0];
  const kept = Math.min(x1 - x0, wide);
  let start = x0;
  if (start < full[0]) start = full[0];
  if (start + kept > full[1]) start = full[1] - kept;
  return { x0: start, x1: start + kept };
}
