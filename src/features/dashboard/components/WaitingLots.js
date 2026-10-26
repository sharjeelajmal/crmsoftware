"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CircleCheck, Clock, Hourglass } from "lucide-react";
import { IDLE_WARN_DAYS, compactNumber } from "@/constants/dashboard";
import { STAGE_LABELS } from "@/constants/lots";
import { STAGE_BADGE_CLASS } from "@/features/cutting/utils";
import { Panel, PanelEmpty } from "./Panel";

const idleLabel = (days) => (days === 0 ? "moved today" : days === 1 ? "1 day" : `${days} days`);

/** Lots in process that have not moved for the longest time; a week or more is flagged. */
export function WaitingLots({ lots, className = "" }) {
  return (
    <Panel
      icon={Hourglass}
      title="Waiting longest"
      subtitle="Lots in process with no movement"
      href="/lots"
      linkLabel="Lots"
      className={className}
      testId="dash-waiting"
    >
      {lots.length === 0 ? (
        <PanelEmpty
          icon={CircleCheck}
          title="Nothing is waiting"
          hint="Every lot is either ready or not started yet."
        />
      ) : (
        <ul className="space-y-2">
          {lots.map((lot, index) => {
            const late = lot.idleDays >= IDLE_WARN_DAYS;
            return (
              <motion.li
                key={lot._id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Link
                  href={`/lots/${lot._id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-surface-muted transition-colors"
                  data-testid="dash-waiting-row"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {lot.lotNumber}
                      <span className="font-normal text-gray-500"> · {lot.productName}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_BADGE_CLASS[lot.stage]}`}
                      >
                        {STAGE_LABELS[lot.stage]}
                      </span>
                      {compactNumber(lot.pieces)} pcs
                    </p>
                  </div>
                  <span
                    className={
                      "inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold " +
                      (late ? "bg-warning-soft text-amber-700" : "bg-surface-muted text-gray-600")
                    }
                    data-tip={late ? `No movement for ${IDLE_WARN_DAYS}+ days` : undefined}
                  >
                    <Clock size={12} aria-hidden="true" />
                    {idleLabel(lot.idleDays)}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default WaitingLots;
