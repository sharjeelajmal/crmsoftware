"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { formatDate, formatMoney } from "@/lib/format";

const rowsByDate = (rows) => rows.sort((a, b) => new Date(b.date) - new Date(a.date));

function Rows({ rows, empty, onRemove, isSaving, testId }) {
  if (rows.length === 0) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100" data-testid={testId}>
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid={`${testId}-row`}>
          <span className="flex-grow min-w-0">
            <span className="flex items-center gap-1.5 font-medium text-gray-800 [overflow-wrap:anywhere]">
              {row.locked && <Lock size={12} className="shrink-0 text-gray-400" />}
              {row.label}
            </span>
            <span className="block text-xs text-gray-500">{formatDate(row.date)}</span>
          </span>
          <span className={`font-semibold whitespace-nowrap tabular-nums ${row.tone}`}>{row.value}</span>
          {row.removable ? (
            <button
              type="button"
              onClick={() => onRemove(row.removable)}
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
  );
}

/**
 * The two things the owner keeps apart (client, 2026-11-23): the BAQAYA — money he still owes the worker (old balances
 * from the notebook, and cash given short at a payment) — and the ADVANCE — money the worker has to give back
 * (advances given, an old "he owes me", extra cash given at a payment; less what was cut). Old balances can be removed
 * here; what a payment made goes when that payment is taken back; advances are managed on the Wages page.
 */
export function BaqayaCard({
  baqaya = 0,
  advance = 0,
  balances = [],
  payments = [],
  advances = [],
  onAdd,
  onRemove,
  isSaving = false,
}) {
  const [removing, setRemoving] = useState(null);
  const locks = payments.filter((p) => p.kind === "lock");

  const owed = rowsByDate([
    ...balances
      .filter((b) => b.amount > 0)
      .map((b) => ({
        key: `b:${b._id}`,
        date: b.date,
        label: b.note || "Old balance",
        value: `+ ${formatMoney(b.amount)}`,
        tone: "text-primary",
        removable: b,
      })),
    ...locks
      .filter((p) => Number(p.balanceChange))
      .map((p) => ({
        key: `p:${p._id}`,
        date: p.date,
        locked: true,
        label:
          p.balanceChange > 0
            ? `Paid up to ${formatDate(p.date)}: given short`
            : `Paid up to ${formatDate(p.date)}: baqaya paid`,
        value: `${p.balanceChange > 0 ? "+" : "−"} ${formatMoney(Math.abs(p.balanceChange))}`,
        tone: p.balanceChange > 0 ? "text-primary" : "text-success",
      })),
  ]);
  const owes = rowsByDate([
    ...advances.map((a) => ({
      key: `a:${a._id}`,
      date: a.date,
      locked: Boolean(a.paymentId),
      label: a.note || (a.type === "advance" ? "Advance given" : "Advance cut"),
      value: `${a.type === "advance" ? "+" : "−"} ${formatMoney(a.amount)}`,
      tone: a.type === "advance" ? "text-amber-700" : "text-success",
    })),
    // a "he owes me" kept as a baqaya below 0 from before the advance split
    ...balances
      .filter((b) => b.amount < 0)
      .map((b) => ({
        key: `b:${b._id}`,
        date: b.date,
        label: b.note || "Old balance",
        value: `+ ${formatMoney(-b.amount)}`,
        tone: "text-amber-700",
        removable: b,
      })),
  ]);

  return (
    <section
      className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm"
      data-testid="khata-baqaya"
      data-amount={baqaya}
      data-advance={advance}
    >
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Remove this old balance?"
            message={`${removing.note || "Old balance"} · ${formatMoney(Math.abs(removing.amount))}`}
            confirmLabel="Remove"
            onConfirm={async () => {
              if (await onRemove(removing)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="khata-balance-remove-confirm"
          />
        )}
      </AnimatePresence>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-800">Baqaya &amp; advance</h2>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-gray-700">Baqaya · you still give him</span>
            <span className="font-bold text-primary tabular-nums">{formatMoney(baqaya)}</span>
          </p>
          <Rows
            rows={owed}
            empty="Nothing owed to him. Cash given short at a payment, and old dues from the copy, show here."
            onRemove={setRemoving}
            isSaving={isSaving}
            testId="khata-baqaya-rows"
          />
        </div>
        <div>
          <p className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-gray-700">Advance · he gives back</span>
            <span className="font-bold text-amber-700 tabular-nums">{formatMoney(advance)}</span>
          </p>
          <Rows
            rows={owes}
            empty="No advance. Advances, extra cash given at a payment and his old dues to you show here."
            onRemove={setRemoving}
            isSaving={isSaving}
            testId="khata-advance-rows"
          />
        </div>
      </div>
    </section>
  );
}

export default BaqayaCard;
