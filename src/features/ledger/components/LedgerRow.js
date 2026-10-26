"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Edit2, History, Layers, Trash2 } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { ledgerTypeLabel } from "@/constants/ledger";
import { formatDate } from "@/lib/format";
import { TYPE_BADGE_CLASS, formatQtyUnit } from "../utils";

const ROW_CLASS =
  "flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white " +
  "transition-transform transform hover:scale-[1.01] shadow-md bg-primary";
const ICON_BUTTON_CLASS = "cursor-pointer transition-transform hover:scale-125 print:hidden";

/** One register entry: type badge, item, qty, lot link, note, recorded by/when and the actions. */
export function LedgerRow({ entry, onEdit, onDelete, onHistory }) {
  const edits = Array.isArray(entry.history) ? entry.history.length : 0;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={ROW_CLASS}
      data-testid="ledger-row"
      data-entry-id={entry._id}
      data-type={entry.type}
      data-lot-number={entry.lotNumber || ""}
    >
      <div className="flex-grow min-w-0 mb-2 md:mb-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_BADGE_CLASS[entry.type] || ""}`}
            data-testid="ledger-row-type"
          >
            {ledgerTypeLabel(entry.type)}
          </span>
          <p className="font-semibold break-words">{entry.item}</p>
        </div>
        <p className="text-xs text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {entry.lotNumber ? (
            <Link
              href={`/lots/${entry.lotId}`}
              className="inline-flex items-center gap-1 font-semibold text-white hover:underline"
              data-testid="ledger-row-lot"
            >
              <Layers size={12} /> {entry.lotNumber}
            </Link>
          ) : null}
          <span>by {entry.by?.name || "—"}</span>
          {edits > 0 ? <span className="italic">edited ×{edits}</span> : null}
        </p>
        {entry.note ? <p className="text-xs italic text-gray-300 mt-1 break-words">Note: {entry.note}</p> : null}
      </div>

      <div className="flex justify-between items-center w-full md:w-auto">
        <span
          className="flex-1 md:flex-none md:w-32 text-left md:text-center text-lg font-bold"
          data-testid="ledger-row-qty"
        >
          {formatQtyUnit(entry.qty, entry.unit)}
        </span>
        <span className="flex-1 md:flex-none md:w-32 text-right md:text-center text-sm">
          <span className="flex items-center justify-end md:justify-center gap-1 text-gray-200">
            <Calendar size={12} />
            {formatDate(entry.createdAt)}
          </span>
        </span>
      </div>

      <div
        className={
          "w-full md:w-40 flex justify-end md:justify-center gap-5 md:gap-4 mt-3 md:mt-0 pt-3 md:pt-0 " +
          "border-t border-white/15 md:border-0 print:hidden"
        }
      >
        <button
          type="button"
          onClick={() => onHistory(entry)}
          data-tip={edits ? `History (${edits} edits)` : "History"}
          aria-label={edits ? `History (${edits} edits)` : "History"}
          className={`${ICON_BUTTON_CLASS} ${edits ? "hover:text-yellow-300" : "text-white/50 hover:text-white"}`}
          data-testid="ledger-row-history"
        >
          <History size={18} />
        </button>
        <button
          type="button"
          onClick={() => onEdit(entry)}
          data-tip="Edit"
          aria-label="Edit"
          className={`${ICON_BUTTON_CLASS} hover:text-yellow-300`}
          data-testid="ledger-row-edit"
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry._id)}
          data-tip="Delete"
          aria-label="Delete"
          className={`${ICON_BUTTON_CLASS} hover:text-red-400`}
          data-testid="ledger-row-delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default LedgerRow;
