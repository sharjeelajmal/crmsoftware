"use client";

import { motion } from "framer-motion";
import { Factory } from "lucide-react";
import { format } from "date-fns";
import { itemVariants } from "@/constants/animations";
import { percentChange, plural } from "@/constants/dashboard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Sparkline } from "@/components/ui/Sparkline";
import { DeltaBadge } from "./DeltaBadge";

function MiniStat({ label, value, hint, testId }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-white/60 truncate">{label}</p>
      <p className="text-lg font-semibold leading-tight" data-testid={testId}>
        <AnimatedNumber value={value} />
      </p>
      {hint && <p className="text-[11px] text-white/60 truncate">{hint}</p>}
    </div>
  );
}

/**
 * The one number the dashboard leads with: net pieces production put into stock this month, compared with the
 * same days of last month, with the last 14 days drawn underneath.
 */
export function HeroProduction({ production, trend, now, className = "" }) {
  const produced = production.producedThisMonth;
  const dayOfMonth = now.getDate();

  return (
    <motion.section
      variants={itemVariants}
      className={
        "relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white shadow-brand " +
        `bg-linear-to-br from-primary via-primary to-primary-hover flex flex-col ${className}`
      }
      data-testid="dash-hero"
    >
      {/* Soft light blobs: decoration only. */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-white/80">
          <Factory size={16} /> Produced this month
        </p>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
          {format(now, "MMMM yyyy")}
        </span>
      </div>

      <p className="relative mt-3 flex items-baseline gap-2">
        <AnimatedNumber
          value={produced}
          className="text-5xl sm:text-6xl font-bold tracking-tight"
          testId="dash-hero-produced"
        />
        <span className="text-lg font-medium text-white/80">pcs</span>
      </p>
      <div className="relative mt-2">
        <DeltaBadge
          value={percentChange(produced, production.producedLastMonth)}
          against="vs same days last month"
          onBrand
        />
      </div>

      <div className="relative mt-4 -mx-1">
        <Sparkline data={trend.map((day) => day.produced)} height={64} tone="onBrand" />
        <p className="mt-1 text-[11px] text-white/60">Pieces into stock, last {trend.length} days</p>
      </div>

      <div className="relative mt-auto pt-5">
        <div className="grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
          <MiniStat
            label="Ready today"
            value={production.readyToday.pieces}
            hint={`${production.readyToday.lots} ${plural(production.readyToday.lots, "invoice")}`}
            testId="dash-hero-ready-today"
          />
          <MiniStat label="Invoices finished" value={production.readyLotsThisMonth} hint="this month" />
          <MiniStat label="Avg per day" value={Math.round(produced / dayOfMonth)} hint="pcs this month" />
        </div>
      </div>
    </motion.section>
  );
}

export default HeroProduction;
