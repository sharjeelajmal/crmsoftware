"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Eye, EyeOff, Search, TrendingUp, Users } from "lucide-react";
import { containerVariants } from "@/constants/animations";
import { StatCard } from "@/components/ui/StatCard";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/ToastProvider";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { errorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { customerStats, filterCustomers } from "@/features/customers/utils";
import { CustomerCard } from "@/features/customers/components/CustomerCard";
import { AddCustomerPopup } from "@/features/customers/components/AddCustomerPopup";
import { ViewSalesPopup } from "@/features/customers/components/ViewSalesPopup";

const NO_POPUP = { type: null, data: null };
const SEARCH_INPUT_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border-gray-200 outline-none focus:scale-[1.01] transition-transform duration-300";

export default function CustomersPage() {
  const toast = useToast();
  const { registered, normal, isLoading, addCustomer, deleteCustomer, updateBalance } = useCustomers();
  const { downloadInvoicePdf } = useInvoicePdf();

  const [viewMode, setViewMode] = useState("registered");
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState(NO_POPUP);
  const [invoiceSale, setInvoiceSale] = useState(null);

  const closePopup = () => setPopup(NO_POPUP);
  const isRegisteredView = viewMode === "registered";
  const filteredCustomers = filterCustomers(isRegisteredView ? registered : normal, searchTerm);
  const stats = customerStats(registered, normal);

  const handleSaveCustomer = async (customer) => {
    if (await addCustomer(customer)) closePopup();
  };

  const handleConfirmDelete = async () => {
    await deleteCustomer(popup.data);
    closePopup();
  };

  const handleSavePdf = async (sale) => {
    try {
      await downloadInvoicePdf(sale);
    } catch (err) {
      toast.error(errorMessage(err, "Could not generate the PDF"));
    }
  };

  // A walk-in customer is registered with the same name/phone; their balance stays in sales.
  const openRegister = (customer) =>
    setPopup({ type: "add", data: { name: customer.name, phone: customer.phone, city: "", openingBalance: 0 } });

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "add" && (
          <AddCustomerPopup initialData={popup.data} onSave={handleSaveCustomer} onClose={closePopup} />
        )}
        {popup.type === "delete" && (
          <ConfirmDialog
            message="Do you really want to remove this customer?"
            confirmLabel="Confirm Delete"
            onConfirm={handleConfirmDelete}
            onCancel={closePopup}
          />
        )}
        {popup.type === "view_sales" && (
          <ViewSalesPopup
            customerName={popup.data}
            onClose={closePopup}
            onViewInvoice={setInvoiceSale}
            onSavePdf={handleSavePdf}
          />
        )}
        {invoiceSale && (
          <Modal size="xl" padded={false} onClose={() => setInvoiceSale(null)}>
            <InvoicePreview sale={invoiceSale} />
          </Modal>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard icon={Users} title="Total Customers" value={stats.totalCustomers} />
          <StatCard icon={DollarSign} title="Total Outstanding Dues" value={formatMoney(stats.totalDues)} />
          <StatCard icon={TrendingUp} title="Top Spender" value={stats.topCustomerName} />
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="bg-white/50 p-4 sm:p-6 rounded-2xl shadow-lg backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {isRegisteredView ? "Registered Customers" : "Normal Customers"}
            </h2>
            <Button
              icon={isRegisteredView ? Eye : EyeOff}
              className="w-full md:w-auto"
              onClick={() => setViewMode(isRegisteredView ? "normal" : "registered")}
            >
              {isRegisteredView ? `View Normal (${normal.length})` : `View Registered (${registered.length})`}
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              autoComplete="off"
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={SEARCH_INPUT_CLASS}
            />
          </div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr"
          >
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer._id || `${customer.name}-${customer.phone}`}
                  customer={customer}
                  onViewSales={(name) => setPopup({ type: "view_sales", data: name })}
                  onDelete={(id) => setPopup({ type: "delete", data: id })}
                  onRegister={openRegister}
                  onSaveBalance={updateBalance}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-10 col-span-full">No customers found.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
