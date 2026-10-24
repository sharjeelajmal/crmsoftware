"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HardHat, Trash2, UserPlus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Loader } from "@/components/ui/Loader";
import { formatDate, formatMoney } from "@/lib/format";
import { useLotWork } from "../hooks/useLotWork";
import { groupByOperation } from "../utils";
import { AssignWorkModal } from "./AssignWorkModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

/** Admin card on the lot page: who did which operation on this lot, what it cost, and the assign action. */
export function WorkPanel({ lot }) {
  const { entries, totals, isLoading, isSaving, assign, removeEntry } = useLotWork(lot);
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
            Labour on this lot:{" "}
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
                      title="Remove"
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
