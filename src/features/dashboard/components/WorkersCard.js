"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { compactNumber } from "@/constants/dashboard";
import { formatMoney } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel, PanelEmpty } from "./Panel";

function Figure({ label, children, testId, className = "" }) {
  return (
    <div className={`min-w-0 rounded-xl bg-surface-muted px-3 py-2.5 ${className}`}>
      <p className="text-[11px] text-gray-500 truncate">{label}</p>
      <p className="text-base font-bold text-gray-800 truncate" data-testid={testId}>
        {children}
      </p>
    </div>
  );
}

/** This week's wages (same week as the Wages page, Monday → Sunday) and the workers with the most pieces. */
export function WorkersCard({ wages, className = "" }) {
  const { week, topWorkers, activeWorkers } = wages;
  const most = topWorkers[0]?.pieces || 0;

  return (
    <Panel
      icon={Users}
      title="Workers this week"
      subtitle={
        activeWorkers > 0
          ? `${week.workers} of ${activeWorkers} active workers have work entries`
          : "No active workers yet"
      }
      href="/wages"
      linkLabel="Wages"
      className={className}
      testId="dash-workers"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Figure label="Net payable" testId="dash-workers-net">
          <AnimatedNumber value={week.net} format={(n) => formatMoney(Math.round(n))} />
        </Figure>
        <Figure label="Pieces done">
          <AnimatedNumber value={week.pieces} format={compactNumber} />
        </Figure>
        <Figure label="Advance left (all)" testId="dash-workers-advance" className="col-span-2 sm:col-span-1">
          <AnimatedNumber value={wages.advanceLeft ?? 0} format={(n) => formatMoney(Math.round(n))} />
        </Figure>
      </div>

      <div className="mt-4">
        {topWorkers.length === 0 ? (
          <PanelEmpty
            icon={Users}
            title="No work entered this week"
            hint="Assign work on an invoice to see who is producing most."
          />
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Most pieces</p>
            <ol className="space-y-2.5">
              {topWorkers.map((worker, index) => (
                <li key={worker.workerId} className="flex items-center gap-3" data-testid="dash-worker-row">
                  <span
                    className={
                      "grid place-items-center w-7 h-7 rounded-full text-xs font-bold shrink-0 " +
                      (index === 0 ? "bg-primary text-white" : "bg-surface-muted text-gray-600")
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-800 truncate">{worker.name}</span>
                      <span className="shrink-0 text-xs text-gray-500 tabular-nums">
                        <span className="font-semibold text-gray-800">{worker.pieces.toLocaleString("en-US")}</span> pcs
                        · {formatMoney(worker.amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-primary-soft overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${most > 0 ? (worker.pieces / most) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Panel>
  );
}

export default WorkersCard;
