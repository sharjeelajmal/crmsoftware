"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCheck, Lock, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { PAYMENT_KIND_LABELS, isPaid, payLabel, workRefLabel } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";
import { PaidToggle } from "@/features/wages/components/PaidToggle";
import { khataSections } from "../utils";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

/**
 * Can this line be marked paid / unpaid on its own? Unpaid work, work paid early, and work of a lock ("Pay all") —
 * held back from it, the lock shrinks. Not work of "Pay the rest" or of a lock with an advance cut: that hand-over is
 * taken back whole from its section, which asks first.
 */
const togglesAlone = (entry, payment) =>
  !isPaid(entry) ||
  entry.paymentKind === "work" ||
  (entry.paymentKind === "lock" && Boolean(payment) && !(Number(payment.advanceCut) > 0));

/** "Cut 2 · 100 pcs" — what the amount is for (client, 2026-11-21: seen by the amount, without opening the invoice). */
const cutPiecesLabel = (entry) => `${entry.cutNumber ? `Cut ${entry.cutNumber} · ` : ""}${entry.pieces} pcs`;

function EntryRow({ entry, payment = null, onTogglePaid, onRemove, isSaving }) {
  const paid = isPaid(entry);
  return (
    <li
      className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-sm"
      data-testid="khata-entry"
      data-paid={paid ? "true" : "false"}
      data-amount={entry.amount}
      data-cut={entry.cutNumber || ""}
    >
      <span className="basis-full sm:basis-auto flex-grow min-w-0">
        <span className="font-medium text-gray-800">
          {entry.operationName}
          {entry.lotNumber ? ` · ${entry.lotNumber}` : ""}
        </span>
        <span className="block text-xs text-gray-500 truncate">
          {formatDate(entry.date)} · {payLabel(entry)}
          {entry.productName ? ` · ${entry.productName}` : ""}
          {entry.note ? ` · ${entry.note}` : ""}
        </span>
      </span>
      <span
        className="mr-auto sm:mr-0 rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary whitespace-nowrap"
        data-testid="khata-entry-cut-pieces"
      >
        {cutPiecesLabel(entry)}
      </span>
      <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(entry.amount)}</span>
      {togglesAlone(entry, payment) && (
        <PaidToggle
          paid={paid}
          onToggle={() => onTogglePaid(entry)}
          disabled={isSaving}
          tip={paid ? "Press to mark unpaid (hold it back)" : "Press to pay this now"}
          testId="khata-entry-paid"
        />
      )}
      <button
        type="button"
        onClick={() => onRemove(entry)}
        disabled={paid || isSaving}
        data-tip={paid ? "Paid — mark it unpaid first" : "Remove"}
        aria-label="Remove"
        className="text-gray-400 hover:text-danger cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
        data-testid="khata-entry-remove"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

/**
 * A worker's khata, newest first: the work not paid yet (since the last lock), then each payment — a lock ("paid up
 * to 18 Nov"), work paid early, the rest of a period — with the work it paid. A payment can be taken back (its work
 * is unpaid again); unpaid work can be paid on its own, all at once ("Pay all", client 2026-11-21: `onPayAll(section)`
 * opens the payment with the cash given — one line can then be held back with its toggle), or removed.
 */
export function KhataLedger({
  entries = [],
  payments = [],
  onTogglePaid,
  onPayAll,
  onRemove,
  onRemovePayment,
  isSaving,
}) {
  const [confirm, setConfirm] = useState(null); // { entry } | { payment }
  const sections = khataSections(entries, payments);

  return (
    <div className="space-y-4" data-testid="khata-ledger">
      <AnimatePresence>
        {confirm?.entry && (
          <ConfirmDialog
            title="Remove this work?"
            message={`${confirm.entry.operationName} · ${workRefLabel(confirm.entry)} · ${confirm.entry.pieces} pcs · ${formatMoney(confirm.entry.amount)}`}
            confirmLabel="Remove"
            onConfirm={async () => {
              if (await onRemove(confirm.entry)) setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
            confirmTestId="khata-entry-remove-confirm"
          />
        )}
        {confirm?.payment && (
          <ConfirmDialog
            title="Take this payment back?"
            message={`${PAYMENT_KIND_LABELS[confirm.payment.kind]} · ${formatMoney(confirm.payment.amount)}. The work it paid becomes unpaid again.`}
            confirmLabel="Take back"
            onConfirm={async () => {
              if (await onRemovePayment(confirm.payment)) setConfirm(null);
            }}
            onCancel={() => setConfirm(null)}
            confirmTestId="khata-payment-remove-confirm"
          />
        )}
      </AnimatePresence>

      {sections.map((section) => {
        if (section.kind === "unpaid") {
          return (
            <section key={section.key} className={CARD_CLASS} data-testid="khata-unpaid" data-amount={section.amount}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-gray-800">Not paid yet</h2>
                <span className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">{formatMoney(section.amount)}</span>
                  {onPayAll && section.entries.length > 0 && (
                    <Button
                      size="sm"
                      icon={CheckCheck}
                      onClick={() => onPayAll(section)}
                      disabled={isSaving}
                      className="whitespace-nowrap"
                      data-testid="khata-pay-all"
                    >
                      Pay all
                    </Button>
                  )}
                </span>
              </div>
              {section.entries.length === 0 ? (
                <p className="text-sm text-gray-500">Everything is paid. New work starts here.</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {section.entries.map((entry) => (
                    <EntryRow
                      key={entry._id}
                      entry={entry}
                      onTogglePaid={onTogglePaid}
                      onRemove={(e) => setConfirm({ entry: e })}
                      isSaving={isSaving}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        }
        const payment = section.payment;
        return (
          <section
            key={section.key}
            className={`${CARD_CLASS} border border-success-border`}
            data-testid="khata-payment"
            data-kind={section.kind}
            data-amount={section.amount}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 font-bold text-gray-800">
                  {section.kind === "lock" && <Lock size={16} className="text-success" />}
                  {section.kind === "lock"
                    ? `Paid up to ${formatDate(payment.date)}`
                    : payment
                      ? `${PAYMENT_KIND_LABELS[section.kind]} · ${formatDate(payment.date)}`
                      : "Paid"}
                </h2>
                {payment && (
                  <p className="text-xs text-gray-500">
                    {payment.advanceCut > 0
                      ? `work ${formatMoney(payment.workAmount)} − advance cut ${formatMoney(payment.advanceCut)} · `
                      : ""}
                    {payment.balanceChange > 0 ? `${formatMoney(payment.balanceChange)} still to give (baqaya) · ` : ""}
                    {payment.balanceChange < 0 && !(payment.extraAdvance > 0)
                      ? `${formatMoney(-payment.balanceChange)} of his baqaya paid · `
                      : ""}
                    {payment.extraAdvance > 0 ? `${formatMoney(payment.extraAdvance)} extra → advance · ` : ""}
                    {payment.by?.name ? `by ${payment.by.name} · ` : ""}
                    {section.entries.length} {section.entries.length === 1 ? "entry" : "entries"}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </p>
                )}
              </div>
              <span className="flex items-center gap-3">
                <span className="text-lg font-bold text-success">{formatMoney(section.amount)}</span>
                {payment && (
                  <button
                    type="button"
                    onClick={() => setConfirm({ payment })}
                    disabled={isSaving}
                    data-tip="Take this payment back"
                    aria-label="Take this payment back"
                    className="text-gray-400 hover:text-danger cursor-pointer disabled:opacity-40"
                    data-testid="khata-payment-remove"
                  >
                    <Undo2 size={16} />
                  </button>
                )}
              </span>
            </div>
            {section.entries.length > 0 && (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {section.entries.map((entry) => (
                  <EntryRow
                    key={entry._id}
                    entry={entry}
                    payment={payment}
                    onTogglePaid={onTogglePaid}
                    onRemove={(e) => setConfirm({ entry: e })}
                    isSaving={isSaving}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default KhataLedger;
