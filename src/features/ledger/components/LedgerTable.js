"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { BRAND } from "@/constants/brand";
import { ledgerTypeLabel } from "@/constants/ledger";
import { Loader } from "@/components/ui/Loader";
import { LedgerRow } from "./LedgerRow";

/**
 * The register list. `id="ledger-print"` is the print area (globals.css): the heading below is
 * print-only so the printed sheet carries the brand, the active filter and the date.
 */
export function LedgerTable({ entries, isLoading, type, periodLabel, onEdit, onDelete, onHistory }) {
  return (
    <div id="ledger-print">
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-gray-800">{BRAND.name} · Loose Items & B-Pair Register</h2>
        <p className="text-sm text-gray-600">
          {type ? ledgerTypeLabel(type) : "All types"} · {periodLabel} · printed {new Date().toLocaleString()} ·{" "}
          {entries.length} entries
        </p>
      </div>

      <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
        <span className="flex-grow">Item</span>
        <span className="w-32 text-center">Quantity</span>
        <span className="w-32 text-center">Date</span>
        <span className="w-40 text-center print:hidden">Actions</span>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 mt-4">
        {isLoading ? (
          <Loader inline />
        ) : entries.length > 0 ? (
          entries.map((entry) => (
            <LedgerRow key={entry._id} entry={entry} onEdit={onEdit} onDelete={onDelete} onHistory={onHistory} />
          ))
        ) : (
          <p className="text-center text-gray-500 py-10" data-testid="ledger-empty">
            No entries for this filter. Record the first one with “New Entry”.
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default LedgerTable;
