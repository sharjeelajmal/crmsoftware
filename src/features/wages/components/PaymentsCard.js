"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { HandCoins, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { PAYMENT_KIND_LABELS } from "@/constants/wages";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

const BADGE_CLASS = {
  work: "bg-success-soft text-success",
  settle: "bg-primary-soft text-primary",
};

const detailOf = (payment) => {
  const work = payment.entryIds?.length ?? 0;
  const parts = [
    work ? `${work} work ${work === 1 ? "entry" : "entries"}` : "",
    payment.lotNumbers?.length ? payment.lotNumbers.join(", ") : "",
    payment.note || "",
  ];
  return parts.filter(Boolean).join(" · ");
};

/**
 * Wage payments of the selected period, newest first: work paid early (from the invoice or the work sheet) and the
 * rest paid with the wages. Removing one makes the work it paid unpaid again.
 */
export function PaymentsCard({ payments = [], onRemove }) {
  const [removing, setRemoving] = useState(null);

  return (
    <div
      className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg print:hidden"
      data-testid="payments-card"
    >
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Remove this payment?"
            message={`${removing.workerName} · ${formatMoney(removing.amount)} · ${PAYMENT_KIND_LABELS[removing.kind]}. The work it paid becomes unpaid again.`}
            confirmLabel="Remove"
            onConfirm={async () => {
              if (await onRemove(removing)) setRemoving(null);
            }}
            onCancel={() => setRemoving(null)}
            confirmTestId="payment-remove-confirm"
          />
        )}
      </AnimatePresence>

      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
        <HandCoins size={18} className="text-primary" /> Payments (this period)
      </h2>
      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing paid in this period yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
          {payments.map((payment) => (
            <li
              key={payment._id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
              data-testid="payment-row"
              data-kind={payment.kind}
              data-worker={payment.workerName}
              data-amount={payment.amount}
            >
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${BADGE_CLASS[payment.kind] || ""}`}
              >
                {PAYMENT_KIND_LABELS[payment.kind] || payment.kind}
              </span>
              <span className="flex-grow min-w-0">
                <span className="font-medium text-gray-800">{payment.workerName}</span>
                <span className="block text-xs text-gray-500 truncate" data-tip={formatDateTime(payment.createdAt)}>
                  {formatDate(payment.date)}
                  {detailOf(payment) ? ` · ${detailOf(payment)}` : ""}
                  {payment.by?.name ? ` · by ${payment.by.name}` : ""}
                </span>
              </span>
              <span className="font-semibold whitespace-nowrap text-gray-800">{formatMoney(payment.amount)}</span>
              <button
                type="button"
                onClick={() => setRemoving(payment)}
                data-tip="Remove"
                aria-label="Remove"
                className="text-gray-400 hover:text-danger cursor-pointer"
                data-testid="payment-remove"
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

export default PaymentsCard;
