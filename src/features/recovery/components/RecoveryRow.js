"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { EditableBalance } from "@/features/customers/components/EditableBalance";

const typeLabel = (customer) => (customer.isNormal ? "Normal" : "Registered");
const typeBadgeClass = (customer) =>
  `px-2 py-1 text-xs font-semibold rounded-full ${
    customer.isNormal ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
  }`;

/** One debtor row: avatar + name/phone, type badge (under the phone on phones), editable total due. */
export function RecoveryRow({ customer, onSaveBalance }) {
  return (
    <motion.tr
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="border-b border-gray-100 hover:bg-gray-50"
    >
      <td className="p-3 sm:p-4 font-semibold text-gray-800">
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 flex items-center justify-center font-bold text-primary">
            {(customer.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <p>{customer.name}</p>
            <p className="text-xs font-normal text-gray-500">{customer.phone}</p>
            <span className={`sm:hidden inline-block mt-1 ${typeBadgeClass(customer)}`}>{typeLabel(customer)}</span>
          </div>
        </div>
      </td>
      <td className="p-4 text-gray-600 hidden sm:table-cell">
        <span className={typeBadgeClass(customer)}>{typeLabel(customer)}</span>
      </td>
      <td className="p-3 sm:p-4 text-right">
        <EditableBalance customer={customer} onSave={onSaveBalance} align="end" inputWidthClass="w-28" iconSize={16} />
      </td>
    </motion.tr>
  );
}

export default RecoveryRow;
