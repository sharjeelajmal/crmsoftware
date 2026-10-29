"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { formatFabricQty, formatRolls } from "@/constants/fabric";

/** Fabric received in the period, newest first, with edit / delete for mistakes. */
export function FabricReceiptsList({ receipts, showHolder = false, onEdit, onDelete }) {
  if (receipts.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500">
        No fabric received in this period.
      </p>
    );
  }

  return (
    <ul className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100 overflow-hidden">
      {receipts.map((receipt, index) => (
        <motion.li
          key={receipt._id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index, 12) * 0.02, duration: 0.2 }}
          className="flex items-center gap-3 px-3 sm:px-4 py-3 text-sm"
          data-testid="fabric-receipt-row"
          data-id={receipt._id}
        >
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 [overflow-wrap:anywhere]">
              {receipt.name}
              <span className="font-bold text-success"> + {formatFabricQty(receipt.qty, receipt.unit)}</span>
              {receipt.rolls > 0 && (
                <span className="font-normal text-gray-500" data-testid="fabric-receipt-rolls">
                  {" "}
                  · {formatRolls(receipt.rolls)}
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 [overflow-wrap:anywhere]">
              {format(new Date(receipt.date), "d MMM yyyy")}
              {showHolder && receipt.holder?.name ? ` · ${receipt.holder.name}` : ""}
              {receipt.note ? ` · ${receipt.note}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(receipt)}
              aria-label="Edit receipt"
              data-tip="Edit receipt"
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-soft cursor-pointer transition-colors"
              data-testid="fabric-receipt-edit"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(receipt)}
              aria-label="Delete receipt"
              data-tip="Delete receipt"
              className="p-2 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-soft cursor-pointer transition-colors"
              data-testid="fabric-receipt-delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

export default FabricReceiptsList;
