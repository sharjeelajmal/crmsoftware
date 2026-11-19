"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { plural } from "@/constants/dashboard";
import { PAY_TYPE_LABELS, paidSplit, round2, workByInvoice } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";
import { workerWorkLine } from "../utils";

const ROW_CLASS = "rounded-xl border border-gray-100 bg-white overflow-hidden";

function PayChips({ types }) {
  return types.map((type) => (
    <span
      key={type}
      className="whitespace-nowrap rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-gray-600"
    >
      {PAY_TYPE_LABELS[type]}
    </span>
  ));
}

/**
 * What is still to pay out of a labour total, standing out ("to pay 13,300"), with the total and what was paid under
 * it ("of 14,000 · paid 700"); "all paid" once nothing is left.
 */
function Remaining({ paid, unpaid, total, className = "", big = false }) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {unpaid > 0 ? (
        <span className={`block font-bold text-primary ${big ? "text-lg" : ""}`}>to pay {formatMoney(unpaid)}</span>
      ) : (
        <span className={`flex md:justify-end items-center gap-1 font-bold text-success ${big ? "text-lg" : ""}`}>
          <Check size={big ? 16 : 12} strokeWidth={3} /> all paid
        </span>
      )}
      <span className="block text-[11px] text-gray-500">
        of {formatMoney(total)}
        {paid > 0 && unpaid > 0 ? ` · paid ${formatMoney(paid)}` : ""}
      </span>
    </span>
  );
}

function InvoiceWork({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={itemVariants}
      className={ROW_CLASS}
      data-testid="invoice-work-row"
      data-lot={row.lotNumber}
      data-workers={row.workerCount}
      data-amount={row.amount}
      data-paid={row.paid}
      data-unpaid={row.unpaid}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full flex flex-col md:flex-row md:items-center gap-2 md:gap-0 p-4 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex-grow min-w-0">
          <span className="font-semibold text-gray-800">{row.lotNumber}</span>
          <span className="text-gray-500"> · {row.productName}</span>
          <span className="block text-xs text-gray-500">
            last work {formatDate(row.lastDate)} · {row.operationCount} {plural(row.operationCount, "operation")}
          </span>
        </span>
        <span className="md:w-32 md:text-center text-sm text-gray-700">
          {row.workerCount} {plural(row.workerCount, "worker")}
        </span>
        <span className="md:w-36 flex md:justify-center gap-1">
          <PayChips types={row.payTypes} />
        </span>
        <Remaining paid={row.paid} unpaid={row.unpaid} total={row.amount} className="md:w-40 md:text-right" big />
        <span className="md:w-10 flex md:justify-center text-gray-500 print:hidden">
          <ChevronDown size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-surface-muted/40">
          <ul className="divide-y divide-gray-100 text-sm" data-testid="invoice-work-workers">
            {row.workers.map((worker) => (
              <li
                key={worker.workerId}
                className="px-4 py-2 flex items-center gap-3"
                data-testid="invoice-work-worker"
                data-worker={worker.workerName}
              >
                <span className="flex-grow min-w-0">
                  <span className="font-medium text-gray-800">{worker.workerName}</span>
                  <span className="block text-xs text-gray-500 [overflow-wrap:anywhere]">{workerWorkLine(worker)}</span>
                </span>
                <span className="hidden sm:flex shrink-0 gap-1">
                  <PayChips types={worker.payTypes} />
                </span>
                <Remaining paid={worker.paid} unpaid={worker.unpaid} total={worker.amount} className="text-right" />
              </li>
            ))}
          </ul>
          <Link
            href={row.lotId ? `/lots/${row.lotId}` : `/khata/cuts/${row.cutId}`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-primary print:hidden"
          >
            <ExternalLink size={14} /> Open {row.lotNumber}
          </Link>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Work of the period per invoice (client, 2026-11-06: "kis project ke saath kitne workers the"): workers,
 * operations, how they were paid, and the labour still to pay out of its total (client, 2026-11-18: a payment must
 * visibly come off); each row opens into its workers.
 */
export function InvoiceWorkList({ entries = [] }) {
  const rows = workByInvoice(entries);
  const total = paidSplit(entries);
  if (rows.length === 0) {
    return (
      <p className="text-center text-gray-500 py-10" data-testid="invoice-work-empty">
        No work on any invoice or cut in this period.
      </p>
    );
  }
  return (
    <div data-testid="invoice-work-list">
      <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
        <span className="flex-grow">Invoice / cut</span>
        <span className="w-32 text-center">Workers</span>
        <span className="w-36 text-center">Pay</span>
        <span className="w-40 text-right">Labour to pay</span>
        <span className="w-10 print:hidden" />
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3 mt-4">
        {rows.map((row) => (
          <InvoiceWork key={row.key} row={row} />
        ))}
      </motion.div>
      <div
        className="flex flex-wrap justify-between gap-2 px-4 pt-4 mt-2 border-t-2 border-gray-200 text-sm"
        data-testid="invoice-work-total"
        data-amount={round2(total.paid + total.unpaid)}
        data-paid={total.paid}
        data-unpaid={total.unpaid}
      >
        <span className="font-bold text-gray-800">
          Total · {rows.length} {plural(rows.length, "invoice")} · labour{" "}
          {formatMoney(round2(total.paid + total.unpaid))} · paid {formatMoney(total.paid)}
        </span>
        <span className="font-bold text-primary">To pay {formatMoney(total.unpaid)}</span>
      </div>
    </div>
  );
}

export default InvoiceWorkList;
