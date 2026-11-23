"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatDate, formatMoney } from "@/lib/format";
import { usualOperations } from "@/features/wages/utils";

/**
 * A worker's box in the stitching khata: name, the operations he usually does with their rate, what is not paid yet,
 * and up to which day he was last paid (lock). Opens his khata.
 */
export function WorkerBox({ worker, operations = [] }) {
  const usual = usualOperations(worker, operations);
  const inactive = worker.active === false;

  return (
    <motion.li variants={itemVariants} initial="hidden" animate="visible">
      <Link
        href={`/khata/workers/${worker._id}`}
        className={`flex h-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-lg ${inactive ? "opacity-60" : ""}`}
        data-testid="khata-worker-box"
        data-worker={worker.name}
        data-unpaid={worker.unpaid ?? 0}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-800 [overflow-wrap:anywhere]">{worker.name}</p>
            <p className="text-xs text-gray-500">
              {inactive ? "Inactive · " : ""}
              {worker.entries ?? 0} {worker.entries === 1 ? "entry" : "entries"}
              {worker.lastWork ? ` · last work ${formatDate(worker.lastWork)}` : ""}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-gray-400" />
        </div>
        {usual.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {usual.map((op) => (
              <span key={op._id} className="rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary">
                {op.name} · Rs {Number(op.rate) || 0}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-500">
            {worker.lastLock ? (
              <span className="inline-flex items-center gap-1">
                <Lock size={12} /> paid up to {formatDate(worker.lastLock.upTo)}
              </span>
            ) : (
              "not locked yet"
            )}
          </span>
          <span className="text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400">To pay</span>
            <span className="block text-lg font-bold text-primary tabular-nums">{formatMoney(worker.unpaid ?? 0)}</span>
            {worker.baqaya > 0 ? (
              <span className="block text-[11px] font-semibold text-primary" data-testid="khata-worker-baqaya">
                baqaya + {formatMoney(worker.baqaya)}
              </span>
            ) : null}
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

export default WorkerBox;
