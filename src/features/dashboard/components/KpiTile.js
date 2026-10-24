"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { compactNumber } from "@/constants/dashboard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/ui/Sparkline";

const ICON_TONES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-amber-700",
  danger: "bg-danger-soft text-danger",
};

/** Filled share of a limit: brand blue on a lighter step of the same blue. */
function Meter({ value, max, label }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="space-y-1.5">
      <div
        className="h-1.5 rounded-full bg-primary-soft overflow-hidden"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="text-[11px] text-gray-500 line-clamp-2">{label}</p>
    </div>
  );
}

/**
 * KPI tile: label, animated value (+ unit), a hint or delta, and an optional sparkline or meter at the bottom.
 * The whole tile links to the page behind the number.
 */
export function KpiTile({ icon: Icon, label, value, unit, hint, delta, trend, meter, tone = "primary", href, testId }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs sm:text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <span
            className={`grid place-items-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 ${ICON_TONES[tone] ?? ICON_TONES.primary}`}
          >
            <Icon size={17} />
          </span>
        )}
      </div>
      <p className="mt-1 flex items-baseline gap-1.5 text-gray-800">
        <AnimatedNumber
          value={value}
          format={compactNumber}
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          testId={testId && `${testId}-value`}
        />
        {unit && <span className="text-xs sm:text-sm font-medium text-gray-500">{unit}</span>}
      </p>
      <div className="mt-1.5 min-h-5">
        {delta ?? (hint && <p className="text-xs text-gray-500 line-clamp-2">{hint}</p>)}
      </div>
      {(trend || meter) && (
        <div className="mt-auto pt-3">{trend ? <Sparkline data={trend} height={36} /> : <Meter {...meter} />}</div>
      )}
    </>
  );

  const className =
    "group relative flex flex-col h-full bg-white rounded-2xl border border-border/70 shadow-soft p-3.5 sm:p-5 min-w-0 " +
    "transition-shadow duration-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="h-full"
    >
      {href ? (
        <Link href={href} className={className} data-testid={testId}>
          {body}
        </Link>
      ) : (
        <div className={className} data-testid={testId}>
          {body}
        </div>
      )}
    </motion.div>
  );
}

export default KpiTile;
