"use client";

import { motion } from "framer-motion";
import { Clock, FileText, Package, Save } from "lucide-react";
import { itemVariants } from "@/constants/animations";

const timeOf = (value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Last five sales with view-invoice and save-PDF actions. */
export function RecentSales({ sales, onViewInvoice, onSavePdf }) {
  return (
    <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Sales</h2>
      <ul className="space-y-3">
        {sales.map((sale) => (
          <li
            key={sale._id}
            className="flex items-center justify-between gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="p-3 bg-blue-100 rounded-full shrink-0 hidden sm:block">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 truncate">{sale.customerName}</p>
                <p className="text-xs text-gray-500">Inv #{String(sale.invoiceNumber).padStart(4, "0")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="text-right">
                <p className="font-bold text-lg text-gray-800">{(Number(sale.subTotal) || 0).toFixed(0)}/-</p>
                <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                  <Clock size={12} />
                  {timeOf(sale.invoiceDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onViewInvoice(sale)}
                title="View Invoice"
                className="cursor-pointer text-gray-400 hover:text-primary transition-colors"
              >
                <FileText size={20} />
              </button>
              <button
                type="button"
                onClick={() => onSavePdf(sale)}
                title="Save as PDF"
                className="cursor-pointer text-gray-400 hover:text-primary transition-colors"
              >
                <Save size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
