"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { itemVariants } from "@/constants/animations";

export function PurchaseCard({ purchase, product, vendor, onDelete }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300"
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 break-words pr-2">{product?.name || "N/A"}</h3>
          <p className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full shrink-0 whitespace-nowrap">
            {(purchase.totalCost || 0).toLocaleString()}/-
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-500">
            From <span className="font-semibold text-gray-700">{vendor?.name || "N/A"}</span>
          </p>
          {purchase.size && (
            <span className="text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded-full">
              Size {purchase.size}
            </span>
          )}
        </div>
      </div>
      <div className="border-t my-4" />
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <p>
            <strong>Quantity:</strong> {purchase.quantity} pcs
          </p>
          <p>
            <strong>Date:</strong> {format(new Date(purchase.purchaseDate), "dd MMM, yyyy")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(purchase._id)}
          className="p-2 text-gray-400 hover:text-red-600 cursor-pointer"
          data-tip="Delete Purchase"
          aria-label="Delete Purchase"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default PurchaseCard;
