"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Droplets, Package, PackageCheck, Scissors, Spool, Workflow } from "lucide-react";
import { PIPELINE_STAGES, compactNumber, plural } from "@/constants/dashboard";
import { STAGE_LABELS } from "@/constants/lots";
import { STAGE_BADGE_CLASS } from "@/features/cutting/utils";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel } from "./Panel";

const STAGE_ICONS = { cutting: Scissors, stitching: Spool, washing: Droplets, packing: Package, ready: PackageCheck };

// Stitching shows what is still lying there; pieces already sent out early are counted at washing.
const PIECES_LABEL = { stitching: "pcs lying" };

function StageCard({ stage, step, lots, pieces, share, hint, href, last = false }) {
  const Icon = STAGE_ICONS[stage];
  return (
    <li className={`relative min-w-0 ${last ? "col-span-2 lg:col-span-1" : ""}`}>
      <Link
        href={href}
        className={
          "group flex flex-col h-full rounded-xl border p-3.5 transition-all duration-300 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
          (last
            ? "border-success-border bg-success-soft hover:shadow-card-hover"
            : "border-border/70 bg-surface-muted/70 hover:bg-white hover:border-primary/30 hover:shadow-card-hover")
        }
        data-testid={`dash-stage-${stage}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={`grid place-items-center w-8 h-8 rounded-lg ${STAGE_BADGE_CLASS[stage]}`}>
            <Icon size={16} />
          </span>
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{String(step).padStart(2, "0")}</span>
        </div>
        <p className="mt-2.5 text-sm font-semibold text-gray-700 truncate">
          {last ? "Ready (this month)" : STAGE_LABELS[stage]}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1 text-gray-800">
          <AnimatedNumber value={lots} className="text-2xl font-bold" testId={`dash-stage-${stage}-lots`} />
          <span className="text-xs text-gray-500">{plural(lots, "lot")}</span>
        </p>
        <p className="text-xs text-gray-500 truncate" data-testid={`dash-stage-${stage}-pieces`} data-value={pieces}>
          {compactNumber(pieces)} {PIECES_LABEL[stage] ?? "pcs"}
        </p>
        <div className="mt-auto pt-3">
          <div className={`h-1 rounded-full overflow-hidden ${last ? "bg-success/15" : "bg-primary-soft"}`}>
            <motion.div
              className={`h-full rounded-full ${last ? "bg-success" : "bg-primary"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(share * 100)}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 * step }}
            />
          </div>
          {hint && <p className="mt-1.5 text-[11px] text-gray-500 truncate">{hint}</p>}
        </div>
      </Link>
      {!last && (
        <span
          className={
            "hidden lg:grid place-items-center absolute top-1/2 -right-3 -translate-y-1/2 z-10 w-6 h-6 rounded-full " +
            "bg-white border border-border text-primary shadow-sm"
          }
          aria-hidden="true"
        >
          <ChevronRight size={14} />
        </span>
      )}
    </li>
  );
}

/**
 * Where the work is right now: lots and pieces at each stage (share of all pieces in process), ending with the
 * lots finished this month. Each stage opens the lots list filtered to it.
 */
export function PipelineFlow({ production }) {
  const { stages, inProcess, stitching } = production;
  const total = inProcess.pieces;

  return (
    <Panel
      icon={Workflow}
      title="Production pipeline"
      subtitle={`${inProcess.lots} ${plural(inProcess.lots, "lot")} · ${compactNumber(inProcess.pieces)} pcs in process right now`}
      href="/lots"
      linkLabel="All lots"
      testId="dash-pipeline"
    >
      <ol className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage, index) => (
          <StageCard
            key={stage}
            stage={stage}
            step={index + 1}
            lots={stages[stage].lots}
            pieces={stages[stage].pieces}
            share={total > 0 ? stages[stage].pieces / total : 0}
            hint={
              stage === "stitching" && stitching.out > 0
                ? `${compactNumber(stitching.out)} pcs already sent on`
                : `${total > 0 ? Math.round((stages[stage].pieces / total) * 100) : 0}% of pieces in process`
            }
            href={`/lots?stage=${stage}`}
          />
        ))}
        <StageCard
          stage="ready"
          step={PIPELINE_STAGES.length + 1}
          lots={production.readyLotsThisMonth}
          pieces={production.producedThisMonth}
          share={production.readyLotsThisMonth > 0 ? 1 : 0}
          hint="net pieces into stock"
          href="/lots?stage=ready"
          last
        />
      </ol>
    </Panel>
  );
}

export default PipelineFlow;
