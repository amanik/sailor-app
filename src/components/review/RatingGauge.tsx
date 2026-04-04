"use client";

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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill={filled ? "var(--color-text-primary)" : "none"}
      stroke="var(--color-text-primary)"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function RatingGauge({
  value,
  onChange,
  min = 1,
  max = 4,
  messages,
  lowLabel,
  highLabel,
}: RatingGaugeProps) {
  const count = max - min + 1;
  const stars = Array.from({ length: count }, (_, i) => min + i);

  const message = messages[value] ?? "";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Stars row */}
      <div className="flex items-center gap-3">
        {stars.map((starValue) => (
          <motion.button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            whileTap={{ scale: 0.85 }}
            animate={{
              scale: starValue <= value ? 1 : 0.85,
              opacity: starValue <= value ? 1 : 0.35,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="p-1 -m-1 touch-manipulation"
            aria-label={`Rate ${starValue} of ${max}`}
          >
            <StarIcon filled={starValue <= value} />
          </motion.button>
        ))}
      </div>

      {/* Large number */}
      <div className="flex items-center justify-center">
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
        <div className="flex items-center justify-between w-full px-2">
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
