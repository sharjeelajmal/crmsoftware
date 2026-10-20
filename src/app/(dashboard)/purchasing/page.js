"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Truck, DollarSign, Plus, Search } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { FilterButton } from "@/components/ui/FilterButton";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { usePurchasing } from "@/features/purchasing/hooks/usePurchasing";
import { AddPurchasePopup } from "@/features/purchasing/components/AddPurchasePopup";
import { VendorPopup } from "@/features/purchasing/components/VendorPopup";
import { PurchaseHistoryView } from "@/features/purchasing/components/PurchaseHistoryView";
import { VendorManagementView } from "@/features/purchasing/components/VendorManagementView";
import { DATE_FILTERS, VIEWS, filterPurchases, filterVendors, purchaseStats } from "@/features/purchasing/utils";

const CLOSED = { type: null, data: null };
const SEARCH_CLASS =
  "pl-12 w-full lg:w-56 py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent " +
  "focus:border-primary focus:scale-105 transition-transform duration-300";

const viewTabClass = (active) =>
  "flex-1 sm:flex-none min-w-0 px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md " +
  "transition-colors duration-300 cursor-pointer text-center leading-tight " +
  (active ? "bg-white shadow text-primary" : "text-gray-600");

export default function PurchasingPage() {
  const [dateFilter, setDateFilter] = useState("daily");
  const [view, setView] = useState(VIEWS.PURCHASES);
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState(CLOSED);

  const { purchases, vendors, products, isLoading, savePurchase, saveVendor, deleteVendor, deletePurchase } =
    usePurchasing(dateFilter);

  const closePopup = () => setPopup(CLOSED);
  const withClose = async (promise) => {
    if (await promise) closePopup();
  };

  const isPurchasesView = view === VIEWS.PURCHASES;
  const stats = purchaseStats(purchases, products);
  const filteredPurchases = filterPurchases(purchases, products, searchTerm);
  const filteredVendors = filterVendors(vendors, searchTerm);

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "addPurchase" && (
          <AddPurchasePopup
            products={products}
            vendors={vendors}
            onSave={(p) => withClose(savePurchase(p))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "vendor" && (
          <VendorPopup
            initialData={popup.data}
            onSave={(vendor) => withClose(saveVendor(vendor))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "deleteVendor" && (
          <ConfirmDialog
            message="Are you sure you want to delete this vendor?"
            onConfirm={() => withClose(deleteVendor(popup.data))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "deletePurchase" && (
          <ConfirmDialog
            message="This will also add the stock back to inventory. Are you sure?"
            onConfirm={() => withClose(deletePurchase(popup.data))}
            onCancel={closePopup}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Purchasing</h1>
          <p className="text-gray-500 mt-1">Manage your inventory purchases and vendors.</p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard icon={DollarSign} title="Purchase Value (Period)" value={formatMoney(stats.totalPurchaseValue)} />
          <StatCard icon={Truck} title="Active Vendors (Period)" value={stats.activeVendorsCount} />
          <StatCard icon={ShoppingBag} title="Most Recent Purchase (Period)" value={stats.recentPurchase} />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center mb-5 gap-3 sm:gap-4">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-full sm:w-auto">
              <button type="button" onClick={() => setView(VIEWS.PURCHASES)} className={viewTabClass(isPurchasesView)}>
                Purchase History
              </button>
              <button type="button" onClick={() => setView(VIEWS.VENDORS)} className={viewTabClass(!isPurchasesView)}>
                Manage Vendors
              </button>
            </div>
            <div className="xl:flex-grow flex xl:justify-center">
              <div className="grid grid-cols-4 sm:flex items-center gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
                {DATE_FILTERS.map(({ value, label }) => (
                  <FilterButton
                    key={value}
                    label={label}
                    active={dateFilter === value}
                    onClick={() => setDateFilter(value)}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative w-full lg:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={`Search ${isPurchasesView ? "product..." : "vendor..."}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={SEARCH_CLASS}
                />
              </div>
              <Button
                icon={Plus}
                className="w-full sm:w-auto shrink-0"
                onClick={() => setPopup({ type: isPurchasesView ? "addPurchase" : "vendor", data: null })}
              >
                {isPurchasesView ? "New Purchase" : "Add Vendor"}
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isPurchasesView ? (
                <PurchaseHistoryView
                  purchases={filteredPurchases}
                  products={products}
                  vendors={vendors}
                  onDelete={(id) => setPopup({ type: "deletePurchase", data: id })}
                />
              ) : (
                <VendorManagementView
                  vendors={filteredVendors}
                  onEdit={(vendor) => setPopup({ type: "vendor", data: vendor })}
                  onDelete={(id) => setPopup({ type: "deleteVendor", data: id })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
}
