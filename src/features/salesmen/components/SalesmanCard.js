"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { Badge, Eye, Phone, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";

export function SalesmanCard({ salesman, onAddSale, onViewSales, onDelete }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={
                "w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-gray-100 flex items-center justify-center " +
                "text-2xl font-bold text-primary"
              }
            >
              {salesman.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{salesman.name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Phone size={14} /> {salesman.phone}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Badge size={14} /> {salesman.cnic}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(salesman._id)}
            aria-label="Delete salesman"
            className="text-gray-400 hover:text-red-500 cursor-pointer"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="border-t my-4" />
        <div className="text-sm space-y-2">
          <p className="flex justify-between">
            <strong>Joining Date:</strong>{" "}
            <span className="text-gray-700">{format(new Date(salesman.joiningDate), "dd MMM, yyyy")}</span>
          </p>
          <p className="flex justify-between">
            <strong>Salary:</strong> <span className="font-bold text-green-600">{formatMoney(salesman.salary)}</span>
          </p>
          <p className="flex justify-between">
            <strong>Total Sales:</strong>{" "}
            <span className="font-bold text-blue-600">{formatMoney(salesman.totalSales)}</span>
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button icon={ShoppingCart} className="w-full" onClick={() => onAddSale(salesman)}>
          Link a Sale
        </Button>
        <Button variant="secondary" icon={Eye} className="w-full" onClick={() => onViewSales(salesman)}>
          View Sales History
        </Button>
      </div>
    </motion.div>
  );
}
