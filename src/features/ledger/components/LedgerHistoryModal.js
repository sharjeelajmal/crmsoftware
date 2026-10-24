"use client";

import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ledgerTypeLabel } from "@/constants/ledger";
import { formatDateTime } from "@/lib/format";
import { historyLines } from "../utils";

/** Who recorded the entry and every edit since, field by field (before → after). */
export function LedgerHistoryModal({ entry, onClose }) {
  const history = Array.isArray(entry?.history) ? entry.history : [];

  return (
    <Modal onClose={onClose} size="md">
      <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 pr-8">
        <History size={20} className="text-primary" />
        History
      </h3>
      <p className="text-sm text-gray-500 mt-1 break-words">
        {ledgerTypeLabel(entry.type)} · {entry.item}
      </p>

      <ol className="relative border-l-2 border-gray-200 ml-2 mt-5 space-y-5" data-testid="ledger-history">
        <li className="pl-5 relative">
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
          <p className="font-semibold text-gray-800">Recorded</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(entry.createdAt)}
            {entry.by?.name ? ` · ${entry.by.name}` : ""}
          </p>
        </li>
        {history.map((snapshot, index) => (
          <li key={index} className="pl-5 relative" data-testid="ledger-history-item">
            <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
            <p className="font-semibold text-gray-800">Edited</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDateTime(snapshot.at)}
              {snapshot.by?.name ? ` · ${snapshot.by.name}` : ""}
            </p>
            <ul className="mt-1.5 space-y-0.5 text-sm text-gray-700">
              {historyLines(snapshot).map((line) => (
                <li key={line.key} className="break-words">
                  <span className="font-medium">{line.label}:</span>{" "}
                  <span className="line-through text-gray-400">{String(line.before)}</span>{" "}
                  <span className="font-semibold text-primary">{String(line.after)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {history.length === 0 && <p className="text-xs text-gray-400 mt-4">No edits yet.</p>}
    </Modal>
  );
}

export default LedgerHistoryModal;
