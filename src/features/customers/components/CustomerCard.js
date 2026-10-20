"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, DollarSign, Eye, Hash, MoreHorizontal, ShoppingCart, Trash2, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { itemVariants } from "@/constants/animations";
import { customerDisplayId, customerStatus } from "../utils";
import { DetailItem } from "./DetailItem";
import { MenuItem } from "./MenuItem";
import { EditableBalance } from "./EditableBalance";

/**
 * One customer tile. `customer` is a registered (has _id) or normal (isNormal) customer
 * with the totals returned by /api/customers.
 */
export function CustomerCard({ customer, onViewSales, onDelete, onRegister, onSaveBalance }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const lastPurchase = customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), "dd MMM, yyyy") : "N/A";
  const status = customerStatus(customer);
  const closeMenuAnd = (action) => () => {
    action();
    setMenuOpen(false);
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, boxShadow: "var(--shadow-card-hover)" }}
      className="bg-white rounded-2xl shadow-md p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 h-full"
    >
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-primary">
              {(customer.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
              <p className="text-sm text-gray-500">{customer.phone}</p>
            </div>
          </div>
          <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.text}</div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
          <DetailItem icon={Hash} label="Customer ID" value={customerDisplayId(customer)} />
          <DetailItem icon={ShoppingCart} label="Total Purchases" value={customer.totalPurchases || 0} />
          <DetailItem icon={DollarSign} label="Amount Spent" value={`${(customer.amountSpent || 0).toFixed(0)}/-`} />
          <DetailItem icon={Calendar} label="Last Purchase" value={lastPurchase} />
        </div>

        <div className="border-t pt-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Total Balance</p>
            <EditableBalance customer={customer} onSave={onSaveBalance} />
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              aria-label="More actions"
            >
              <MoreHorizontal size={20} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl z-10 overflow-hidden"
                >
                  <MenuItem icon={Eye} text="View Sales" onClick={closeMenuAnd(() => onViewSales(customer.name))} />
                  {customer.isNormal ? (
                    <MenuItem
                      icon={UserCheck}
                      text="Register Customer"
                      onClick={closeMenuAnd(() => onRegister(customer))}
                    />
                  ) : (
                    <MenuItem
                      icon={Trash2}
                      text="Remove Customer"
                      isDestructive
                      onClick={closeMenuAnd(() => onDelete(customer._id))}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default CustomerCard;
