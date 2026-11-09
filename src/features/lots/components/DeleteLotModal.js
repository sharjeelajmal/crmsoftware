"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { STAGE_LABELS, deleteProblem } from "@/constants/lots";
import { plural } from "@/constants/dashboard";
import { formatMoney } from "@/lib/format";
import { useGatePasses } from "@/features/cutting/hooks/useGatePasses";
import { useLotWork } from "@/features/wages/hooks/useLotWork";
import { useDeleteLot } from "../hooks/useDeleteLot";

const INPUT_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-danger";

/**
 * Deletes an invoice at any stage after showing what goes with it: its gate passes, history and work entries (out of
 * wages), and pieces in stock come back out. Past cutting the invoice number must be typed to confirm.
 */
export function DeleteLotModal({ lot, onDeleted, onCancel }) {
  const { deleteLot, isDeleting } = useDeleteLot();
  const { passes, isLoading: passesLoading } = useGatePasses(lot._id, lot.updatedAt);
  const work = useLotWork(lot);
  const [typed, setTyped] = useState("");
  const problem = deleteProblem(lot);
  const needsTyping = lot.stage !== "cutting";
  const typedOk = !needsTyping || typed.trim().toUpperCase() === String(lot.lotNumber).toUpperCase();
  const isLoading = passesLoading || work.isLoading;
  const canConfirm = !problem && typedOk && !isLoading && !isDeleting;

  const lines = [
    `Stage: ${STAGE_LABELS[lot.stage] ?? lot.stage}.`,
    `${passes.length} ${plural(passes.length, "gate pass", "gate passes")} and the history are removed.`,
    work.entries.length > 0
      ? `${work.entries.length} ${plural(work.entries.length, "work entry", "work entries")} ` +
        `(${formatMoney(work.totals.amount)}) are removed from wages.`
      : "No work entries.",
    ...(lot.stockApplied ? [`${Number(lot.readyQty) || 0} pieces go back out of ${lot.productName} stock.`] : []),
    "Loose items / B-pair entries stay in their register.",
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canConfirm) return;
    if (await deleteLot(lot)) onDeleted?.();
  };

  return (
    <Modal onClose={isDeleting ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} data-testid="lot-delete-form">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Trash2 size={20} className="text-danger" />
          Delete {lot.lotNumber}?
        </h3>
        {problem ? (
          <p className="text-sm text-danger mt-2" data-testid="lot-delete-problem">
            {problem}
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc pl-5" data-testid="lot-delete-lines">
            {(isLoading ? [] : lines).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {!problem && needsTyping && (
          <>
            <label htmlFor="lot-delete-typed" className="block text-sm font-medium text-gray-700 mt-4 mb-1">
              Type <span className="font-bold">{lot.lotNumber}</span> to confirm
            </label>
            <input
              autoComplete="off"
              id="lot-delete-typed"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={lot.lotNumber}
              className={INPUT_CLASS}
              data-testid="lot-delete-typed"
              autoFocus
            />
          </>
        )}
        <p className="text-xs text-gray-500 mt-3">This cannot be undone.</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={isDeleting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            icon={Trash2}
            disabled={!canConfirm}
            className="w-full sm:w-auto"
            data-testid="lot-delete-confirm"
          >
            {isDeleting ? "Deleting…" : "Delete invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default DeleteLotModal;
