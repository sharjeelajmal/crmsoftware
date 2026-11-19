"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { plural } from "@/constants/dashboard";
import { formatDate, formatMoney } from "@/lib/format";

/** The khata's cuts: number, article, pieces, who worked on it, labour and what is still to pay. Each opens its page. */
export function CutsList({ cuts = [] }) {
  if (cuts.length === 0) {
    return (
      <p className="text-center text-gray-500 py-10" data-testid="khata-cuts-empty">
        No cuts yet. When a cutting comes to stitching, add it here with “Add cut”.
      </p>
    );
  }
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
      {cuts.map((cut) => (
        <motion.li key={cut._id} variants={itemVariants}>
          <Link
            href={`/khata/cuts/${cut._id}`}
            className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            data-testid="khata-cut-row"
            data-cut={cut.cutNumber}
            data-unpaid={cut.unpaid}
          >
            <span className="flex-grow min-w-0">
              <span className="font-bold text-gray-800">Cut {cut.cutNumber}</span>
              {cut.article ? <span className="text-gray-500"> · {cut.article}</span> : null}
              <span className="block text-xs text-gray-500">
                {formatDate(cut.date)} · {cut.pieces} pcs · {cut.workers} {plural(cut.workers, "worker")}
              </span>
            </span>
            <span className="md:w-44 md:text-right whitespace-nowrap tabular-nums">
              {cut.unpaid > 0 ? (
                <span className="block font-bold text-primary">to pay {formatMoney(cut.unpaid)}</span>
              ) : cut.amount > 0 ? (
                <span className="flex md:justify-end items-center gap-1 font-bold text-success">
                  <Check size={14} strokeWidth={3} /> all paid
                </span>
              ) : (
                <span className="block text-gray-500">no work yet</span>
              )}
              <span className="block text-[11px] text-gray-500">labour {formatMoney(cut.amount)}</span>
            </span>
            <ChevronRight size={18} className="hidden md:block shrink-0 text-gray-400" />
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export default CutsList;
