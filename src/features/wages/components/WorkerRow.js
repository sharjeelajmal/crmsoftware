"use client";

import { motion } from "framer-motion";
import { Edit2, Phone, Trash2, UserCheck, UserX } from "lucide-react";
import { itemVariants } from "@/constants/animations";

const ROW_CLASS =
  "flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white " +
  "transition-transform transform hover:scale-[1.01] shadow-md";
const ICON_CLASS = "cursor-pointer transition-transform hover:scale-125";

/** One worker: name, phone, type, active state and the actions. */
export function WorkerRow({ worker, onEdit, onToggleActive, onDelete }) {
  const active = worker.active !== false;
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className={`${ROW_CLASS} ${active ? "bg-primary" : "bg-gray-400"}`}
      data-testid="worker-row"
      data-worker-name={worker.name}
      data-active={active}
    >
      <div className="flex-grow min-w-0 mb-2 md:mb-0">
        <p className="font-semibold break-words">{worker.name}</p>
        <p className="text-xs text-gray-200 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <span className="capitalize">{worker.type || "stitching"}</span>
          {Number(worker.dailyRate) > 0 ? <span>Rs {worker.dailyRate}/day</span> : null}
          {worker.phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone size={12} /> {worker.phone}
            </span>
          ) : null}
          {worker.note ? <span className="italic">{worker.note}</span> : null}
        </p>
      </div>
      <span
        className={`md:w-32 text-xs font-semibold px-2.5 py-1 rounded-full ${active ? "bg-white/20" : "bg-white/30"} md:text-center`}
      >
        {active ? "Active" : "Inactive"}
      </span>
      <div
        className={
          "w-full md:w-40 flex justify-end md:justify-center gap-5 md:gap-4 mt-3 md:mt-0 pt-3 md:pt-0 " +
          "border-t border-white/15 md:border-0"
        }
      >
        <button
          type="button"
          onClick={() => onEdit(worker)}
          title="Edit"
          className={`${ICON_CLASS} hover:text-yellow-300`}
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onToggleActive(worker, !active)}
          title={active ? "Deactivate" : "Activate"}
          className={`${ICON_CLASS} hover:text-yellow-300`}
          data-testid="worker-toggle"
        >
          {active ? <UserX size={18} /> : <UserCheck size={18} />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(worker)}
          title="Delete"
          className={`${ICON_CLASS} hover:text-red-300`}
          data-testid="worker-delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default WorkerRow;
