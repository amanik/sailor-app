"use client";

interface HalfPieGaugeProps {
  readonly score: number;
  readonly size?: number;
  readonly label?: string;
  readonly subtitle?: string;
}

/**
 * Semicircular (180-degree) gauge chart showing a score 0-100.
 * Gray background arc with black filled arc proportional to score.
 */
export function HalfPieGauge({
  score,
  size = 180,
  label,
  subtitle,
}: HalfPieGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = size >= 160 ? 14 : 10;
  const r = (size - strokeWidth) / 2;
  // Half circle: arc length is pi * r
  const halfCircumference = Math.PI * r;
  const filled = (clampedScore / 100) * halfCircumference;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
      >
        {/* Background arc (180 degrees, bottom half hidden) */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="var(--color-bg-secondary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${r} ${r} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="var(--color-fg-primary)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${halfCircumference}`}
        />
        {/* Score number */}
        <text
          x={size / 2}
          y={size / 2 - 8}
          textAnchor="middle"
          dominantBaseline="auto"
          className={`fill-text-primary font-bold tracking-tighter ${size >= 160 ? "text-[36px]" : "text-[28px]"}`}
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {clampedScore}
        </text>
        {label && (
          <text
            x={size / 2}
            y={size / 2 + 10}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="fill-text-tertiary text-[10px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {label}
          </text>
        )}
      </svg>
      {subtitle && (
        <p className="mt-1 max-w-[240px] text-center text-[11px] leading-relaxed text-text-tertiary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
