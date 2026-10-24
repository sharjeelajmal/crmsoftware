"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Scissors, Wallet } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { ADJUSTMENT_LABELS } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";
import { Collapse } from "@/components/ui/Collapse";

/** One worker's account: given / cut / left, a Cut button, and the history with the balance after each entry. */
function AccountRow({ account, onCut }) {
  const [open, setOpen] = useState(false);
  const cleared = account.balance <= 0;
  const historyNewestFirst = [...account.history].reverse();

  return (
    <motion.li
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-gray-100 bg-white overflow-hidden"
      data-testid="advance-account"
      data-worker={account.workerName}
      data-balance={account.balance}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 min-w-0 items-center gap-2 sm:gap-3 text-left cursor-pointer"
        >
          <ChevronDown
            size={18}
            className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block font-semibold text-gray-800 truncate">{account.workerName}</span>
            <span className="block text-xs text-gray-500">
              Given {formatMoney(account.given)} · Cut {formatMoney(account.recovered)}
            </span>
          </span>
        </button>
        <span className="shrink-0 text-right">
          <span className="block text-[11px] text-gray-500">Left</span>
          <span
            className={`block text-base sm:text-lg font-bold ${cleared ? "text-success" : "text-gray-800"}`}
            data-testid="advance-left"
          >
            {cleared ? "Cleared" : formatMoney(account.balance)}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onCut(account)}
          disabled={cleared}
          className={
            "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-2 text-sm font-semibold transition-colors cursor-pointer " +
            "bg-primary-soft text-primary hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed " +
            "disabled:hover:bg-primary-soft disabled:hover:text-primary"
          }
          data-testid="advance-cut"
        >
          <Scissors size={15} /> Cut
        </button>
      </div>

      <Collapse open={open}>
        <div className="border-t border-gray-100">
          <table className="w-full text-sm" data-testid="advance-history">
            <thead className="bg-surface-muted text-xs text-gray-500">
              <tr>
                <th className="text-left font-semibold px-3 sm:px-4 py-2">Date</th>
                <th className="hidden sm:table-cell text-left font-semibold px-4 py-2">Entry</th>
                <th className="text-right font-semibold px-3 sm:px-4 py-2">Amount</th>
                <th className="text-right font-semibold px-3 sm:px-4 py-2">Left after</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {historyNewestFirst.map((entry) => {
                const given = entry.type === "advance";
                return (
                  <tr key={entry._id} className="border-t border-gray-100">
                    <td className="px-3 sm:px-4 py-2 text-gray-600">
                      <span className="whitespace-nowrap">{formatDate(entry.date)}</span>
                      {/* Phones: the entry sits under the date instead of its own column. */}
                      <span className="sm:hidden block text-xs text-gray-800">
                        {ADJUSTMENT_LABELS[entry.type]}
                        {entry.note ? <span className="text-gray-500"> · {entry.note}</span> : null}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-2 text-gray-800">
                      {ADJUSTMENT_LABELS[entry.type]}
                      {entry.note ? <span className="text-gray-500"> · {entry.note}</span> : null}
                    </td>
                    <td
                      className={`px-3 sm:px-4 py-2 text-right whitespace-nowrap font-semibold ${given ? "text-gray-800" : "text-danger"}`}
                    >
                      {given ? "+" : "−"}
                      {formatMoney(entry.amount)}
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right whitespace-nowrap font-semibold text-gray-800">
                      {formatMoney(entry.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapse>
    </motion.li>
  );
}

/**
 * Advance account (khata) of every worker, all time: an advance stays here until it is cut from a salary with an
 * "Advance cut" (any amount, whenever the admin decides); whatever is not cut carries forward by itself.
 */
export function AdvancesCard({ accounts = [], totals, onCut }) {
  return (
    <div
      className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg print:hidden"
      data-testid="advances-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Wallet size={18} className="text-primary" /> Advance account (khata)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            All time · an advance is cut only when you record an Advance cut; the rest carries forward.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] text-gray-500">Total advance left</p>
          <p
            className="text-xl font-bold text-primary"
            data-testid="advances-total"
            data-balance={totals?.balance ?? 0}
          >
            {formatMoney(totals?.balance ?? 0)}
          </p>
        </div>
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-gray-500">No advances given yet.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <AccountRow key={account.workerId} account={account} onCut={onCut} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default AdvancesCard;
