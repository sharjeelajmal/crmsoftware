"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useReverseLot } from "../hooks/useReverseLot";

const TEXTAREA_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary resize-none";

/** Asks for the (required) reason and takes the lot's pieces back out of stock. */
export function ReverseLotModal({ lot, onReversed, onCancel }) {
  const { reverseLot, isReversing } = useReverseLot();
  const [reason, setReason] = useState("");
  const pieces = Number(lot?.readyQty) || 0;
  const canConfirm = reason.trim().length > 0 && !isReversing;

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
        <p className="text-sm text-gray-600 mt-2">
          <span className="font-semibold">{pieces} pieces</span> of {lot.productName} will be taken back out of stock
          and the lot returns to packing. The reason is kept in the lot history.
        </p>
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
          placeholder="e.g. counted twice, pieces failed final QC"
          className={TEXTAREA_CLASS}
          data-testid="lot-reverse-reason"
          autoFocus
          required
        />
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
            {isReversing ? "Reversing…" : "Take stock back"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReverseLotModal;
