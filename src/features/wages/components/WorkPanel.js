"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, HardHat, Trash2, UserPlus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Loader } from "@/components/ui/Loader";
import { formatDate, formatMoney } from "@/lib/format";
import { operationProgress } from "@/constants/operations";
import { workPiecesOf } from "@/constants/wages";
import { useLotWork } from "../hooks/useLotWork";
import { useLotOperations } from "../hooks/useLotOperations";
import { groupByOperation } from "../utils";
import { AssignWorkModal } from "./AssignWorkModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

const chipClass = (op) =>
  op.complete
    ? "bg-success-soft text-success"
    : op.pieces > 0
      ? "bg-yellow-50 text-yellow-800"
      : "bg-surface-muted text-gray-600";

/**
 * Admin card on the lot page: who did which operation on this lot, what it cost, the assign action, and — when the
 * lot's category has a rate card — how far each of its operations has got (pieces assigned out of the lot's pieces).
 */
export function WorkPanel({ lot }) {
  const { entries, totals, isLoading, isSaving, assign, removeEntry } = useLotWork(lot);
  const offer = useLotOperations(lot?._id);
  const lotPieces = workPiecesOf(lot);
  const progress = offer.fromCard ? operationProgress(offer.operations, entries, lotPieces) : [];
  const [popup, setPopup] = useState(null); // "assign" | { remove: entry }
  const groups = groupByOperation(entries);

  const handleAssign = async (form) => {
    if (await assign(form)) setPopup(null);
  };
  const handleRemove = async () => {
    if (await removeEntry(popup.remove._id)) setPopup(null);
  };

  return (
    <motion.div variants={itemVariants} className={CARD_CLASS} data-testid="lot-work-panel">
      <AnimatePresence>
        {popup === "assign" && (
          <AssignWorkModal lot={lot} onSave={handleAssign} onCancel={() => setPopup(null)} isSaving={isSaving} />
        )}
        {popup?.remove && (
          <ConfirmDialog
            title="Remove work entry?"
            message={`${popup.remove.workerName} · ${popup.remove.operationName} · ${popup.remove.pieces} pcs will be removed from wages.`}
            confirmLabel="Remove"
            onConfirm={handleRemove}
            onCancel={() => setPopup(null)}
            confirmTestId="work-remove-confirm"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <HardHat size={18} className="text-primary" /> Work &amp; wages
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Labour on this invoice:{" "}
            <span className="font-semibold text-gray-800" data-testid="lot-work-amount" data-amount={totals.amount}>
              {formatMoney(totals.amount)}
            </span>
            {totals.perPiece > 0 ? ` · Rs ${totals.perPiece} per piece` : ""}
          </p>
        </div>
        <Button
          icon={UserPlus}
          onClick={() => setPopup("assign")}
          className="w-full sm:w-auto"
          data-testid="lot-assign-work"
        >
          Assign work
        </Button>
      </div>

      {progress.length > 0 && (
        <div className="mb-4" data-testid="lot-work-progress">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">
            {offer.category} operations · pieces done out of {lotPieces}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {progress.map((op) => (
              <span
                key={op.operationId}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${chipClass(op)}`}
                data-testid="lot-work-op"
                data-operation={op.name}
                data-pieces={op.pieces}
                data-complete={op.complete}
              >
                {op.complete && <Check size={12} strokeWidth={3} />}
                {op.name} {op.pieces}/{lotPieces}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader inline />
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="lot-work-empty">
          No work assigned yet. Pick an operation and the workers who did it.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.operationName} data-testid="lot-work-group" data-operation={group.operationName}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-semibold text-gray-800">{group.operationName}</span>
                <span className="text-gray-500">
                  {group.pieces} pcs · <span className="font-semibold text-gray-800">{formatMoney(group.amount)}</span>
                </span>
              </div>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                {group.entries.map((entry) => (
                  <li
                    key={entry._id}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                    data-testid="lot-work-entry"
                    data-worker={entry.workerName}
                  >
                    <span className="flex-grow min-w-0">
                      <span className="font-medium text-gray-800">{entry.workerName}</span>
                      <span className="block text-xs text-gray-500">
                        {formatDate(entry.date)} · {entry.pieces} pcs × Rs {entry.rate}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </span>
                    </span>
                    <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(entry.amount)}</span>
                    <button
                      type="button"
                      onClick={() => setPopup({ remove: entry })}
                      data-tip="Remove"
                      aria-label="Remove"
                      className="text-gray-400 hover:text-danger cursor-pointer"
                      data-testid="lot-work-remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default WorkPanel;
