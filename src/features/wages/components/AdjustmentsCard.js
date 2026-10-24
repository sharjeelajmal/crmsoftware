"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CalendarMinus, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { ADJUSTMENT_LABELS, PAY_EFFECT } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";

const BADGE_CLASS = {
  leave: "bg-yellow-100 text-yellow-800",
  advance: "bg-primary-soft text-primary",
  recovery: "bg-purple-100 text-purple-700",
  deduction: "bg-danger-soft text-danger",
  bonus: "bg-success-soft text-success",
};

const DETAIL = {
  advance: "to the advance account (not cut)",
  recovery: "cut from salary, off the advance",
  deduction: "cut",
  bonus: "added",
};

const detailOf = (adj) => (adj.type === "leave" ? `${adj.days} day(s) × Rs ${adj.rate}` : DETAIL[adj.type] || "");

const SIGN = { [-1]: "−", 0: "", 1: "+" };

/** Leave / advance / advance cut / deduction / bonus entries of the selected period, newest first, with delete. */
export function AdjustmentsCard({ adjustments = [], onDelete }) {
  const [removing, setRemoving] = useState(null);

  return (
    <div
      className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg print:hidden"
      data-testid="adjustments-card"
    >
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Delete this entry?"
            message={`${ADJUSTMENT_LABELS[removing.type]} · ${removing.workerName} · ${formatMoney(removing.amount)}`}
            confirmLabel="Delete"
            onConfirm={async () => {
              if (await onDelete(removing._id)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="adjustment-delete-confirm"
          />
        )}
      </AnimatePresence>

      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
        <CalendarMinus size={18} className="text-primary" /> Leave, advance &amp; deductions (this period)
      </h2>
      {adjustments.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing recorded in this period.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {adjustments.map((adj) => (
            <li
              key={adj._id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
              data-testid="adjustment-row"
              data-type={adj.type}
              data-worker={adj.workerName}
            >
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${BADGE_CLASS[adj.type] || ""}`}
              >
                {ADJUSTMENT_LABELS[adj.type] || adj.type}
              </span>
              <span className="flex-grow min-w-0">
                <span className="font-medium text-gray-800">{adj.workerName}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {formatDate(adj.date)} · {detailOf(adj)}
                  {adj.note ? ` · ${adj.note}` : ""}
                </span>
              </span>
              <span
                className={`font-semibold whitespace-nowrap ${
                  PAY_EFFECT[adj.type] > 0
                    ? "text-success"
                    : PAY_EFFECT[adj.type] < 0
                      ? "text-gray-800"
                      : "text-primary"
                }`}
              >
                {SIGN[PAY_EFFECT[adj.type] ?? -1]}
                {formatMoney(adj.amount)}
              </span>
              <button
                type="button"
                onClick={() => setRemoving(adj)}
                title="Delete"
                className="text-gray-400 hover:text-danger cursor-pointer"
                data-testid="adjustment-delete"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdjustmentsCard;
