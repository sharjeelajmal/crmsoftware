"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { STAGE_LABELS, reversePlan } from "@/constants/lots";
import { useGatePasses } from "@/features/cutting/hooks/useGatePasses";
import { useReverseLot } from "../hooks/useReverseLot";

const TEXTAREA_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary resize-none";

/** What "Reverse" will do at this stage, line by line, for the confirmation. */
function reverseLines(lot, plan) {
  if (lot.stage === "ready") {
    return [
      `${Number(lot.readyQty) || 0} pieces of ${lot.productName} are taken back out of stock.`,
      "The invoice returns to Packing.",
    ];
  }
  const lines = [`The invoice goes back to ${STAGE_LABELS[plan.to]}.`];
  if (lot.stage === "stitching" && (Number(lot.stitchOutQty) || 0) > 0) {
    lines.push(`The ${lot.stitchOutQty} pieces sent out of stitching no longer count as sent out.`);
  }
  if (lot.stage === "washing") lines.push(`The ${lot.stitchedQty ?? 0} stitched pieces recorded are cleared.`);
  if (lot.stage === "packing") lines.push(`The ${lot.washedQty ?? 0} washed pieces recorded are cleared.`);
  if (plan.cancel.length > 0) {
    const one = plan.cancel.length === 1;
    lines.push(
      `Gate ${one ? "pass" : "passes"} ${plan.cancel.map((p) => p.number).join(", ")} will be marked Cancelled ` +
        `(${one ? "it stays" : "they stay"} listed).`
    );
  }
  lines.push("Work entries are not changed.");
  return lines;
}

/**
 * "Reverse": takes the invoice back one stage, with a required reason kept in the history. At ready the pieces go
 * back out of stock; earlier the quantities of the last move are cleared and its gate passes cancelled (reversePlan).
 */
export function ReverseLotModal({ lot, onReversed, onCancel }) {
  const { reverseLot, isReversing } = useReverseLot();
  const { passes, isLoading } = useGatePasses(lot._id, lot.updatedAt);
  const [reason, setReason] = useState("");
  const plan = reversePlan(lot, passes, lot.events ?? []);
  const canConfirm = reason.trim().length > 0 && !isReversing && !isLoading && !plan.problem;
  const isReady = lot.stage === "ready";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canConfirm) return;
    const updated = await reverseLot(lot, reason);
    if (updated) onReversed?.(updated);
  };

  return (
    <Modal onClose={isReversing ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} data-testid="lot-reverse-form">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Undo2 size={20} className="text-danger" />
          Reverse {lot.lotNumber}?
        </h3>
        {plan.problem ? (
          <p className="text-sm text-danger mt-2" data-testid="lot-reverse-problem">
            {plan.problem}
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc pl-5" data-testid="lot-reverse-lines">
            {(isLoading ? [] : reverseLines(lot, plan)).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <label htmlFor="lot-reverse-reason" className="block text-sm font-medium text-gray-700 mt-4 mb-1">
          Reason <span className="text-danger">*</span>
        </label>
        <textarea
          autoComplete="off"
          id="lot-reverse-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            isReady ? "e.g. counted twice, pieces failed final QC" : "e.g. moved by mistake, pieces came back"
          }
          className={TEXTAREA_CLASS}
          data-testid="lot-reverse-reason"
          autoFocus
          required
        />
        <p className="text-xs text-gray-500 mt-1">The reason is kept in the invoice history.</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={isReversing} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            icon={Undo2}
            disabled={!canConfirm}
            className="w-full sm:w-auto"
            data-testid="lot-reverse-confirm"
          >
            {isReversing ? "Reversing…" : isReady ? "Take stock back" : `Back to ${STAGE_LABELS[plan.to] ?? ""}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReverseLotModal;
