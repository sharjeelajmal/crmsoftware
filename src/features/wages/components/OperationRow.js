"use client";

import { motion } from "framer-motion";
import { Edit2, Eye, EyeOff, Trash2 } from "lucide-react";
import { itemVariants } from "@/constants/animations";

const ROW_CLASS =
  "flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white " +
  "transition-transform transform hover:scale-[1.01] shadow-md";
const ICON_CLASS = "cursor-pointer transition-transform hover:scale-125";

/** One stitching operation with its per-piece rate. */
export function OperationRow({ operation, index, onEdit, onToggleActive, onDelete }) {
  const active = operation.active !== false;
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={`${ROW_CLASS} ${active ? "bg-primary" : "bg-gray-400"}`}
      data-testid="operation-row"
      data-operation-name={operation.name}
    >
      <div className="flex-grow min-w-0 mb-2 md:mb-0 flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-white/20 text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-semibold break-words">{operation.name}</p>
          {!active && <p className="text-xs text-gray-200">Inactive — hidden from new assignments</p>}
        </div>
      </div>
      <span className="md:w-40 text-lg font-bold md:text-center" data-testid="operation-rate">
        Rs {Number(operation.rate) || 0}
        <span className="text-xs font-normal text-gray-200"> / pc</span>
      </span>
      <div
        className={
          "w-full md:w-40 flex justify-end md:justify-center gap-5 md:gap-4 mt-3 md:mt-0 pt-3 md:pt-0 " +
          "border-t border-white/15 md:border-0"
        }
      >
        <button
          type="button"
          onClick={() => onEdit(operation)}
          title="Edit"
          className={`${ICON_CLASS} hover:text-yellow-300`}
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onToggleActive(operation, !active)}
          title={active ? "Deactivate" : "Activate"}
          className={`${ICON_CLASS} hover:text-yellow-300`}
        >
          {active ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(operation)}
          title="Delete"
          className={`${ICON_CLASS} hover:text-red-300`}
          data-testid="operation-delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default OperationRow;
