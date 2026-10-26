"use client";

import { motion } from "framer-motion";
import { Calendar, Edit2, Tag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { itemVariants } from "@/constants/animations";

const ROW_CLASS =
  "flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white " +
  "transition-transform transform hover:scale-[1.01] shadow-md bg-primary";

export function ExpenseRow({ expense, onEdit, onDelete }) {
  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className={ROW_CLASS}>
      <div className="flex-grow mb-2 md:mb-0">
        <p className="font-semibold">{expense.name}</p>
        <p className="text-xs text-gray-300 flex items-center gap-1 mt-1">
          <Tag size={12} />
          {expense.category}
        </p>
        {expense.note && <p className="text-xs italic text-gray-400 mt-1 block md:hidden">Note: {expense.note}</p>}
      </div>
      <div className="flex justify-between items-center w-full md:w-auto md:gap-0">
        <span className="flex-1 md:flex-none md:w-32 text-left md:text-center text-lg font-bold">
          {expense.amount.toLocaleString()}/-
        </span>
        <span className="flex-1 md:flex-none md:w-32 text-right md:text-center text-sm">
          <p className="flex items-center justify-end md:justify-center gap-1 text-gray-200">
            <Calendar size={12} />
            {format(new Date(expense.date), "dd MMM, yyyy")}
          </p>
        </span>
      </div>
      <div
        className={
          "w-full md:w-40 flex justify-end md:justify-center gap-5 md:gap-4 mt-3 md:mt-0 pt-3 md:pt-0 " +
          "border-t border-white/15 md:border-0"
        }
      >
        <button
          type="button"
          onClick={() => onEdit(expense)}
          data-tip="Edit"
          aria-label="Edit"
          className="cursor-pointer transition-transform hover:scale-125 hover:text-yellow-300"
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(expense._id)}
          data-tip="Delete"
          aria-label="Delete"
          className="cursor-pointer transition-transform hover:scale-125 hover:text-red-400"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default ExpenseRow;
