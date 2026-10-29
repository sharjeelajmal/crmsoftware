"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { ReverseLotModal } from "./ReverseLotModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

/**
 * Shown once a lot is ready: what was added to stock, when, by whom and the per-size split.
 * `canReverse` (admin) shows the "take stock back" action; `onUpdated(lot)` fires after a reversal.
 */
export function ReadyDoneCard({ lot, canReverse = true, onUpdated }) {
  const [reversing, setReversing] = useState(false);
  const pieces = Number(lot?.readyQty) || 0;
  const readySizes = Array.isArray(lot?.readySizes) ? lot.readySizes : [];
  // Once pieces have left the factory the ready entry can't be taken back (they are no longer in stock).
  const dispatched = Number(lot?.dispatchQty) || 0;

  const handleReversed = (updated) => {
    setReversing(false);
    onUpdated?.(updated);
  };

  return (
    <div
      className={`${CARD_CLASS} border border-success-border bg-success-soft/40`}
      data-testid="lot-stage-panel"
      data-panel-state="completed"
    >
      <AnimatePresence>
        {reversing && <ReverseLotModal lot={lot} onReversed={handleReversed} onCancel={() => setReversing(false)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0" data-testid="lot-ready-done" data-qty={pieces}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <CheckCircle2 size={18} className="text-success" />
            Completed
          </h2>
          <p className="text-sm text-gray-700 mt-1 break-words">
            <span className="font-bold text-success">+{pieces} pieces</span> added to{" "}
            <span className="font-semibold">{lot.productName}</span> stock on {formatDateTime(lot.stockAppliedAt)}
            {lot.stockAppliedBy?.name ? (
              <>
                {" "}
                by <span className="font-semibold">{lot.stockAppliedBy.name}</span>
              </>
            ) : null}
          </p>
        </div>
        {canReverse && dispatched === 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={Undo2}
            onClick={() => setReversing(true)}
            className="w-full sm:w-auto shrink-0 text-danger"
            data-testid="lot-reverse"
          >
            Reverse (take stock back)
          </Button>
        )}
      </div>

      {readySizes.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {readySizes.map((row) => (
            <span
              key={row.size}
              className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-sm text-gray-700"
              data-testid="lot-ready-done-size"
              data-size={row.size}
            >
              <span className="font-semibold">{row.size}</span> · +{Number(row.qty) || 0}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReadyDoneCard;
