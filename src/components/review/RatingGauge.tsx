"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RatingGaugeProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  messages: Record<number, string>;
  lowLabel?: string;
  highLabel?: string;
}

const GAUGE_WIDTH = 220;
const GAUGE_HEIGHT = 130;
const CENTER_X = GAUGE_WIDTH / 2;
const CENTER_Y = GAUGE_HEIGHT - 10;
const RADIUS = 90;
const DOT_RADIUS_ACTIVE = 7;
const DOT_RADIUS_FILLED = 5;
const DOT_RADIUS_EMPTY = 3.5;

function valueToAngle(value: number, min: number, max: number): number {
  const fraction = (value - min) / (max - min);
  // Map from PI (left) to 0 (right) — a half-circle arc
  return Math.PI * (1 - fraction);
}

function angleToValue(angle: number, min: number, max: number): number {
  const fraction = 1 - angle / Math.PI;
  return Math.round(fraction * (max - min) + min);
}

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy - r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(startAngle - endAngle) > Math.PI ? 1 : 0;
  // Arc goes from start to end counterclockwise (sweep=0)
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function RatingGauge({
  value,
  onChange,
  min = 1,
  max = 10,
  messages,
  lowLabel,
  highLabel,
}: RatingGaugeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const clamp = useCallback(
    (v: number) => Math.max(min, Math.min(max, v)),
    [min, max],
  );

  const resolveValueFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      // Convert client coords to SVG coords
      const svgX = ((clientX - rect.left) / rect.width) * GAUGE_WIDTH;
      const svgY = ((clientY - rect.top) / rect.height) * GAUGE_HEIGHT;
      const dx = svgX - CENTER_X;
      const dy = CENTER_Y - svgY;
      let angle = Math.atan2(dy, dx);
      // Clamp to upper half-circle
      if (angle < 0) angle = 0;
      if (angle > Math.PI) angle = Math.PI;
      return clamp(angleToValue(angle, min, max));
    },
    [clamp, min, max],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as Element).setPointerCapture(e.pointerId);
      const v = resolveValueFromEvent(e.clientX, e.clientY);
      if (v !== null) onChange(v);
    },
    [onChange, resolveValueFromEvent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const v = resolveValueFromEvent(e.clientX, e.clientY);
      if (v !== null) onChange(v);
    },
    [onChange, resolveValueFromEvent],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Build dots on the arc
  const dots = [];
  for (let i = min; i <= max; i++) {
    const angle = valueToAngle(i, min, max);
    const pos = polarToCartesian(CENTER_X, CENTER_Y, RADIUS, angle);
    const isActive = i === value;
    const isFilled = i <= value;
    const r = isActive ? DOT_RADIUS_ACTIVE : isFilled ? DOT_RADIUS_FILLED : DOT_RADIUS_EMPTY;
    dots.push(
      <circle
        key={i}
        cx={pos.x}
        cy={pos.y}
        r={r}
        fill={isFilled ? "var(--color-text-primary)" : "none"}
        stroke={isFilled ? "var(--color-text-primary)" : "var(--color-border-secondary)"}
        strokeWidth={isFilled ? 0 : 1.5}
      />,
    );
  }

  // Arc paths
  const bgArc = describeArc(CENTER_X, CENTER_Y, RADIUS, Math.PI, 0);
  const fillAngle = valueToAngle(value, min, max);
  const fillArc = describeArc(CENTER_X, CENTER_Y, RADIUS, Math.PI, fillAngle);

  const message = messages[value] ?? "";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}
        width={GAUGE_WIDTH}
        height={GAUGE_HEIGHT}
        className="select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label="Rating gauge"
      >
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="var(--color-border-secondary)"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={fillArc}
          fill="none"
          stroke="var(--color-text-primary)"
          strokeWidth={6}
          strokeLinecap="round"
          initial={false}
          animate={{ d: fillArc }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        {/* Increment dots on arc */}
        {dots}
      </svg>

      {/* Large number */}
      <div className="flex items-center justify-center -mt-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            className="text-4xl font-bold text-text-primary tabular-nums"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Dynamic message */}
      <div className="h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={value}
            className="text-sm text-text-tertiary text-center"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Low/High labels */}
      {(lowLabel || highLabel) && (
        <div className="flex items-center justify-between w-full px-4 mt-1">
          <span className="text-[10px] text-text-tertiary">{lowLabel}</span>
          <span className="text-[10px] text-text-tertiary">{highLabel}</span>
        </div>
      )}

      {/* Hidden range input for accessibility */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sr-only"
        aria-label="Rating"
      />
    </div>
  );
}
