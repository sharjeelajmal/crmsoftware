"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Check, Edit, FileText, Save, UserPlus, X } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { computeTotals, productOfItem } from "../utils";
import { EditFieldGroup } from "./EditFieldGroup";
import { SaleItemSizeSelect } from "./SaleItemSizeSelect";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5 } },
  exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.05, duration: 0.3 } }),
};

const CELL_INPUT = "w-full bg-transparent text-center outline-none text-sm font-semibold text-gray-700";
const CELL_BOX =
  "flex items-center justify-center bg-gray-100 rounded-lg px-2 py-1 w-24 mx-auto group-hover:bg-white " +
  "group-hover:shadow-inner transition-all";

/** Full-screen editor for an existing sale. Totals are recomputed live; `onSave` gets the whole updated sale. */
export function EditSalePopup({ sale, onSave, onCancel, isSaving = false }) {
  const [formData, setFormData] = useState({ ...sale, items: (sale.items || []).map((item) => ({ ...item })) });
  // Products resolve each item's size list so a sized item can be re-picked instead of typed.
  const productList = useAsyncData(() => api.get("/api/products"), [], { initialData: [], cacheKey: "products" });
  const products = Array.isArray(productList.data) ? productList.data : [];

  const totals = useMemo(() => computeTotals(formData.items, formData), [formData]);
  const isDue = totals.balance > 0;

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const handleFieldChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={overlayVariants}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        variants={modalVariants}
        className={
          "bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col " +
          "max-h-[95vh] sm:max-h-[90vh]"
        }
      >
        <div className="bg-primary p-4 sm:p-6 flex justify-between items-center relative overflow-hidden shrink-0">
          <div
            className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl
              pointer-events-none"
          />
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
              <Edit className="text-white/80" size={24} /> Edit Invoice
            </h2>
            <div className="flex items-center gap-4 mt-2 text-green-100/80 text-sm">
              <span className="bg-white/10 px-3 py-1 rounded-full">
                #{String(formData.invoiceNumber).padStart(4, "0")}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {formatDate(formData.invoiceDate)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors relative z-10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 bg-gray-50/50 flex-grow">
          <motion.div variants={sectionVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EditFieldGroup
                label="Customer Name"
                icon={UserPlus}
                value={formData.customerName}
                onChange={(e) => handleFieldChange("customerName", e.target.value)}
              />
              <EditFieldGroup
                label="Contact Number"
                icon={Check}
                value={formData.customerPhone}
                onChange={(e) => handleFieldChange("customerPhone", e.target.value)}
              />
            </div>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <FileText size={18} className="text-primary" /> Order Items
              </h3>
              <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded border">
                Total Items: {formData.items.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                  <tr style={{ backgroundColor: "var(--color-primary-soft)" }}>
                    <th className="p-4 text-left">Product Details</th>
                    <th className="p-4 text-center w-28">Size</th>
                    <th className="p-4 text-center w-32">Qty</th>
                    <th className="p-4 text-center w-32">Price (Rs)</th>
                    <th className="p-4 text-right w-40">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <motion.tr
                      key={index}
                      custom={index}
                      variants={rowVariants}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="p-3">
                        <input
                          autoComplete="off"
                          type="text"
                          value={item.desc}
                          onChange={(e) => handleItemChange(index, "desc", e.target.value)}
                          className="w-full bg-transparent border-b border-transparent focus:border-primary outline-none py-1
                            text-gray-700 font-medium transition-colors"
                        />
                      </td>
                      <td className="p-3 text-center text-sm font-semibold text-gray-700">
                        <SaleItemSizeSelect
                          product={productOfItem(item, products)}
                          value={item.size}
                          onChange={(size) => handleItemChange(index, "size", size)}
                          emptyText={<span className="text-gray-300">-</span>}
                        />
                      </td>
                      <td className="p-3">
                        <div className={CELL_BOX}>
                          <input
                            autoComplete="off"
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                            className={CELL_INPUT}
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className={CELL_BOX}>
                          <input
                            autoComplete="off"
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(index, "price", e.target.value)}
                            className={CELL_INPUT}
                          />
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-800">
                        {formatMoney((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0))}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div variants={sectionVariants} className="flex flex-col lg:flex-row justify-end gap-8">
            <div
              className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full lg:w-[400px] space-y-4 relative
                overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full -mr-4 -mt-4" />

              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Sub Total</span>
                <span className="font-bold text-gray-800 text-lg">{formatMoney(totals.subTotal)}</span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500 font-medium text-sm">Others (+)</span>
                <input
                  autoComplete="off"
                  type="number"
                  value={formData.others}
                  onChange={(e) => handleFieldChange("others", e.target.value)}
                  className="w-28 text-right bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none
                    focus:border-primary transition-colors"
                />
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500 font-medium text-sm">Discount (-)</span>
                <input
                  autoComplete="off"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleFieldChange("discount", e.target.value)}
                  className="w-28 text-right bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-1.5 text-sm font-semibold
                    outline-none focus:border-red-300 transition-colors"
                />
              </div>

              <div className="border-t border-dashed border-gray-200 my-2" />

              <div className="flex justify-between items-center">
                <span className="text-primary font-bold text-lg">Net Total</span>
                <span className="font-extrabold text-2xl text-primary">{formatMoney(totals.total)}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                <span className="text-gray-600 font-bold text-sm">Received Amount</span>
                <input
                  autoComplete="off"
                  type="number"
                  value={formData.receivedAmount}
                  onChange={(e) => handleFieldChange("receivedAmount", e.target.value)}
                  className="w-32 text-right bg-white border border-gray-200 rounded-lg px-3 py-2 font-bold text-gray-800 outline-none
                    focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <motion.div
                animate={{
                  backgroundColor: isDue ? "var(--color-danger-soft)" : "var(--color-success-soft)",
                  borderColor: isDue ? "var(--color-danger-border)" : "var(--color-success-border)",
                }}
                className="p-4 rounded-xl border flex justify-between items-center transition-colors duration-300"
              >
                <span className={`font-bold text-sm ${isDue ? "text-red-600" : "text-green-700"}`}>
                  {isDue ? "Balance Due" : "Change Return"}
                </span>
                <span className={`font-extrabold text-2xl ${isDue ? "text-red-600" : "text-green-700"}`}>
                  {formatMoney(Math.abs(totals.balance))}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div
          className={
            "p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end " +
            "gap-3 sm:gap-4 shrink-0"
          }
        >
          <button
            type="button"
            onClick={onCancel}
            className={
              "w-full sm:w-auto px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl " +
              "transition-colors text-sm cursor-pointer"
            }
          >
            Cancel
          </button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, boxShadow: "var(--shadow-brand)" }}
            whileTap={{ scale: 0.98 }}
            disabled={isSaving}
            onClick={() => onSave({ ...formData, ...totals })}
            className={
              "w-full sm:w-auto justify-center px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg " +
              "shadow-primary/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            }
          >
            <Save size={18} /> {isSaving ? "Saving..." : "Save Changes"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EditSalePopup;
