"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { useSales } from "@/features/sales/hooks/useSales";
import { EditSalePopup } from "@/features/sales/components/EditSalePopup";
import { SaleRow } from "@/features/sales/components/SaleRow";

const CLOSED = { type: null, data: null };

export default function SalesPage() {
  const { sales, isLoading, isCustomerRegistered, addCustomer, updateSale, deleteSale } = useSales();
  const { downloadInvoicePdf, isGenerating } = useInvoicePdf();
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState(CLOSED);
  const [isSaving, setIsSaving] = useState(false);

  const closePopup = () => setPopup(CLOSED);

  const confirmDelete = async () => {
    const ok = await deleteSale(popup.data._id);
    if (ok) closePopup();
  };

  const confirmUpdate = async (updatedSale) => {
    setIsSaving(true);
    const ok = await updateSale(updatedSale);
    setIsSaving(false);
    if (ok) closePopup();
  };

  const filteredSales = sales.filter((sale) =>
    (sale.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <Loader />;

  return (
    <>
      {isGenerating && <Loader text="Generating PDF..." />}
      <AnimatePresence>
        {popup.type === "delete" && (
          <ConfirmDialog
            message="Do you really want to delete this sale? The items will be returned to stock."
            confirmLabel="Confirm Delete"
            onConfirm={confirmDelete}
            onCancel={closePopup}
          />
        )}
        {popup.type === "view" && (
          <Modal onClose={closePopup} size="xl" padded={false}>
            <InvoicePreview sale={popup.data} />
          </Modal>
        )}
        {popup.type === "edit" && (
          <EditSalePopup sale={popup.data} onSave={confirmUpdate} onCancel={closePopup} isSaving={isSaving} />
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">
        <motion.header variants={itemVariants} className="flex justify-between items-center">
          <div className="relative flex items-center w-full sm:w-72">
            <Search className="absolute left-4 text-gray-400" size={20} />
            <input
              autoComplete="off"
              type="text"
              placeholder="Search by Customer"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full bg-white rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </motion.header>

        <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
            <Link href="/sales/new" className="w-full sm:w-auto">
              <Button icon={Plus} className="w-full sm:w-auto">
                Add New Sale
              </Button>
            </Link>
          </div>
          <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium">
            <span className="flex-grow">Customer Name</span>
            <span className="w-24 text-center">Invoice #</span>
            <span className="w-32 text-center">Date</span>
            <span className="w-24 text-center">Amount</span>
            <span className="w-48 text-center">Actions</span>
          </div>

          <motion.div variants={containerVariants} className="space-y-3">
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <SaleRow
                  key={sale._id}
                  sale={sale}
                  isCustomerRegistered={isCustomerRegistered(sale)}
                  onEdit={(s) => setPopup({ type: "edit", data: s })}
                  onView={(s) => setPopup({ type: "view", data: s })}
                  onPdf={downloadInvoicePdf}
                  onAddCustomer={addCustomer}
                  onDelete={(s) => setPopup({ type: "delete", data: s })}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No sales found.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
