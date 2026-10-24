"use client";

import { motion } from "framer-motion";
import { Check, Edit, FileText, Save, Trash2, UserPlus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatDate } from "@/lib/format";

const ICON_BUTTON = "cursor-pointer transition-transform hover:scale-125";

const padInvoice = (n) => String(n ?? 0).padStart(4, "0");

/** One sale in the history list with its action buttons. */
export function SaleRow({ sale, isCustomerRegistered, onEdit, onView, onPdf, onAddCustomer, onDelete }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white transition-transform transform
        hover:scale-[1.01] bg-primary"
    >
      <div className="flex-grow mb-3 md:mb-0">
        <p className="font-medium">{sale.customerName}</p>
        <p className="text-xs text-gray-300 md:hidden">
          Inv# {padInvoice(sale.invoiceNumber)} - {formatDate(sale.invoiceDate)}
        </p>
      </div>
      <span className="hidden md:inline-block w-24 text-center">{padInvoice(sale.invoiceNumber)}</span>
      <span className="hidden md:inline-block w-32 text-center">{formatDate(sale.invoiceDate)}</span>
      <span className="w-24 text-center font-bold md:font-normal">{(Number(sale.subTotal) || 0).toFixed(0)}/-</span>
      <div className="w-full md:w-48 flex justify-end md:justify-center gap-4 mt-3 md:mt-0">
        <button type="button" onClick={() => onEdit(sale)} title="Edit Invoice" className={ICON_BUTTON}>
          <Edit size={18} />
        </button>
        <button type="button" onClick={() => onView(sale)} title="View Invoice" className={ICON_BUTTON}>
          <FileText size={18} />
        </button>
        <button type="button" onClick={() => onPdf(sale)} title="Save as PDF" className={ICON_BUTTON}>
          <Save size={18} />
        </button>
        {isCustomerRegistered ? (
          <Check size={18} className="text-green-400" aria-label="Customer Already Saved" />
        ) : (
          <button type="button" onClick={() => onAddCustomer(sale)} title="Add to Customers" className={ICON_BUTTON}>
            <UserPlus size={18} />
          </button>
        )}
        <button type="button" onClick={() => onDelete(sale)} title="Delete Sale" className={ICON_BUTTON}>
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default SaleRow;
