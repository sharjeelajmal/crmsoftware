"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { BRAND } from "@/constants/brand";
import { formatDate, formatMoney } from "@/lib/format";
import { rangeLabel } from "../utils";

const ROW_CLASS = "rounded-xl text-white shadow-md bg-primary overflow-hidden";

function WorkerWages({ row, entries }) {
  const [open, setOpen] = useState(false);
  const mine = entries.filter((e) => String(e.workerId) === row.workerId);
  const hasAdjustments = row.leaves || row.recoveries || row.deductions || row.bonuses;
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={ROW_CLASS}
      data-testid="wages-row"
      data-worker={row.workerName}
      data-net={row.net}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-col md:flex-row md:items-center gap-2 md:gap-0 p-4 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex-grow min-w-0">
          <span className="font-semibold block">{row.workerName}</span>
          <span className="text-xs text-gray-200">
            {row.entries} entries · {row.pieces} pcs
            {hasAdjustments
              ? ` · wages ${formatMoney(row.amount)}${row.bonuses ? ` + bonus ${formatMoney(row.bonuses)}` : ""}` +
                `${row.leaves ? ` − leave ${formatMoney(row.leaves)} (${row.leaveDays} day${row.leaveDays === 1 ? "" : "s"})` : ""}` +
                `${row.recoveries ? ` − advance cut ${formatMoney(row.recoveries)}` : ""}` +
                `${row.deductions ? ` − deduction ${formatMoney(row.deductions)}` : ""}`
              : ""}
            {row.advances ? ` · advance given ${formatMoney(row.advances)}` : ""}
            {row.advanceLeft > 0 ? ` · advance left ${formatMoney(row.advanceLeft)}` : ""}
          </span>
        </span>
        <span className="md:w-32 md:text-center text-sm">{row.pieces} pcs</span>
        <span className="md:w-36 md:text-center text-lg font-bold">{formatMoney(row.net)}</span>
        <span className="md:w-10 flex md:justify-center print:hidden">
          <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <ul className="bg-white text-gray-800 divide-y divide-gray-100 text-sm" data-testid="wages-entries">
          {mine.length === 0 && <li className="px-4 py-2 text-gray-500">No work entries in this period.</li>}
          {mine.map((entry) => (
            <li key={entry._id} className="px-4 py-2 flex items-center gap-3">
              <span className="flex-grow min-w-0">
                <span className="font-medium">{entry.operationName}</span>
                <span className="text-xs text-gray-500 block">
                  {formatDate(entry.date)} · {entry.lotNumber} · {entry.productName}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {entry.pieces} × Rs {entry.rate}
              </span>
              <span className="font-semibold whitespace-nowrap">{formatMoney(entry.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/** Per-worker wages for the period; each row expands into its work entries. `id="wages-print"` is the print area. */
export function WagesTable({ report, label }) {
  const workers = report?.workers ?? [];
  const totals = report?.totals ?? {};
  return (
    <div id="wages-print">
      <div className="hidden print:block mb-4">
        <h2 className="text-xl font-bold text-gray-800">{BRAND.name} · Wages</h2>
        <p className="text-sm text-gray-600">
          {label} · {rangeLabel(report?.from, report?.to)} · printed {new Date().toLocaleString()}
        </p>
      </div>
      <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
        <span className="flex-grow">Worker</span>
        <span className="w-32 text-center">Pieces</span>
        <span className="w-36 text-center">Net payable</span>
        <span className="w-10 print:hidden" />
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 mt-4">
        {workers.length === 0 ? (
          <p className="text-center text-gray-500 py-10" data-testid="wages-empty">
            No work entries in this period. Assign work from a lot page (Lots → lot → Work &amp; wages).
          </p>
        ) : (
          workers.map((row) => <WorkerWages key={row.workerId} row={row} entries={report?.entries ?? []} />)
        )}
      </motion.div>
      {workers.length > 0 && (
        <div className="flex flex-wrap justify-between gap-2 px-4 pt-4 mt-2 border-t-2 border-gray-200 text-sm">
          <span className="font-bold text-gray-800">
            Total · {totals.workers} workers · {totals.pieces} pcs
          </span>
          <span className="font-bold text-primary" data-testid="wages-total" data-net={totals.net}>
            {formatMoney(totals.net)}
          </span>
        </div>
      )}
    </div>
  );
}

export default WagesTable;
