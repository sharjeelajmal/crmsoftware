"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { baqayaLabel } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";

const signed = (amount) => `${amount > 0 ? "+" : "−"} ${formatMoney(Math.abs(amount))}`;
const tone = (amount) => (amount > 0 ? "text-primary" : "text-amber-700");

/**
 * A worker's baqaya and where it comes from (client, 2026-11-22): old balances written in from the notebook (which
 * can be removed) and each payment where less or more cash was given than due (taken back from its section).
 * + the owner owes him, − he owes the owner.
 */
export function BaqayaCard({ baqaya = 0, balances = [], payments = [], onAdd, onRemove, isSaving = false }) {
  const [removing, setRemoving] = useState(null);
  const fromLocks = payments.filter((p) => p.kind === "lock" && Number(p.balanceChange));
  const rows = [
    ...balances.map((b) => ({
      key: `b:${b._id}`,
      date: b.date,
      amount: b.amount,
      balance: b,
      label: b.note || "Old balance",
    })),
    ...fromLocks.map((p) => ({
      key: `p:${p._id}`,
      date: p.date,
      amount: p.balanceChange,
      label: `Paid up to ${formatDate(p.date)}: ${formatMoney(p.amount)} given of ${formatMoney(
        p.amount + p.balanceChange + (Number(p.baqayaBefore) || 0)
      )} due`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <section className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm" data-testid="khata-baqaya" data-amount={baqaya}>
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Remove this old balance?"
            message={`${removing.note || "Old balance"} · ${signed(removing.amount)}`}
            confirmLabel="Remove"
            onConfirm={async () => {
              if (await onRemove(removing)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="khata-balance-remove-confirm"
          />
        )}
      </AnimatePresence>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Baqaya</h2>
          <p className={`text-sm font-semibold ${baqaya === 0 ? "text-success" : tone(baqaya)}`}>
            {baqayaLabel(baqaya)}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Plus}
          onClick={onAdd}
          disabled={isSaving}
          className="whitespace-nowrap"
          data-testid="khata-add-balance"
        >
          Old balance
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing pending. Old balances from the copy, and any cash given less or more than due, show here.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid="khata-baqaya-row">
              <span className="flex-grow min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-gray-800 [overflow-wrap:anywhere]">
                  {!row.balance && <Lock size={12} className="shrink-0 text-gray-400" />}
                  {row.label}
                </span>
                <span className="block text-xs text-gray-500">
                  {formatDate(row.date)} · {row.amount > 0 ? "you owe him" : "he owes you"}
                </span>
              </span>
              <span className={`font-semibold whitespace-nowrap tabular-nums ${tone(row.amount)}`}>
                {signed(row.amount)}
              </span>
              {row.balance ? (
                <button
                  type="button"
                  onClick={() => setRemoving(row.balance)}
                  disabled={isSaving}
                  data-tip="Remove"
                  aria-label="Remove"
                  className="text-gray-400 hover:text-danger cursor-pointer disabled:opacity-40"
                  data-testid="khata-balance-remove"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <span className="w-4" aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default BaqayaCard;
