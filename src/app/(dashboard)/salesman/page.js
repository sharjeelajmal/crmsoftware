"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/ToastProvider";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { errorMessage } from "@/lib/api-client";
import { containerVariants, itemVariants } from "@/constants/animations";
import { useSalesmen } from "@/features/salesmen/hooks/useSalesmen";
import { filterSalesmen } from "@/features/salesmen/utils";
import { SalesmanStats } from "@/features/salesmen/components/SalesmanStats";
import { SalesmanCard } from "@/features/salesmen/components/SalesmanCard";
import { AddSalesmanPopup } from "@/features/salesmen/components/AddSalesmanPopup";
import { LinkSalePopup } from "@/features/salesmen/components/LinkSalePopup";
import { SalesHistoryPopup } from "@/features/salesmen/components/SalesHistoryPopup";

const CLOSED = { type: null, data: null };

const SEARCH_INPUT_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent " +
  "focus:border-primary focus:scale-105 transition-transform duration-300";

export default function SalesmanPage() {
  const toast = useToast();
  const { salesmen, isLoading, createSalesman, deleteSalesman, linkSale } = useSalesmen();
  const { downloadInvoicePdf } = useInvoicePdf();
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState(CLOSED);

  const closePopup = () => setPopup(CLOSED);

  const handleSaveSalesman = async (salesman) => {
    if (await createSalesman(salesman)) closePopup();
  };

  const handleDeleteSalesman = async () => {
    if (await deleteSalesman(popup.data)) closePopup();
  };

  const handleLinkSale = async (invoiceNumber) => {
    if (await linkSale(invoiceNumber, popup.data._id)) closePopup();
  };

  const handleSavePdf = async (sale) => {
    try {
      await downloadInvoicePdf(sale);
    } catch (err) {
      toast.error(errorMessage(err, "Could not generate the PDF."));
    }
  };

  // Invoice preview opens from the history popup; closing it returns to that popup.
  const backToHistory = () => {
    const salesman = salesmen.find((s) => s._id === popup.data.salesmanId);
    setPopup(salesman ? { type: "view_sales", data: salesman } : CLOSED);
  };

  const filteredSalesmen = filterSalesmen(salesmen, searchTerm);

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "add_salesman" && <AddSalesmanPopup onSave={handleSaveSalesman} onCancel={closePopup} />}
        {popup.type === "delete" && (
          <ConfirmDialog
            message="Are you sure?"
            confirmLabel="Confirm Delete"
            onConfirm={handleDeleteSalesman}
            onCancel={closePopup}
          />
        )}
        {popup.type === "add_sale" && (
          <LinkSalePopup salesmanName={popup.data.name} onSave={handleLinkSale} onCancel={closePopup} />
        )}
        {popup.type === "view_sales" && (
          <SalesHistoryPopup
            salesman={popup.data}
            onCancel={closePopup}
            onViewInvoice={(sale) => setPopup({ type: "view_invoice", data: sale })}
            onSavePdf={handleSavePdf}
          />
        )}
        {popup.type === "view_invoice" && (
          <Modal onClose={backToHistory} size="xl" padded={false}>
            <InvoicePreview sale={popup.data} />
          </Modal>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold">Sales Team</h1>
          <p className="text-gray-500 mt-1">Manage your sales team and their performance.</p>
        </motion.div>

        <SalesmanStats salesmen={salesmen} />

        <motion.div variants={itemVariants} className="bg-white/80 p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                autoComplete="off"
                type="text"
                placeholder="Search salesman..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={SEARCH_INPUT_CLASS}
              />
            </div>
            <Button
              size="lg"
              icon={UserPlus}
              className="w-full sm:w-auto"
              onClick={() => setPopup({ type: "add_salesman", data: null })}
            >
              Add Salesman
            </Button>
          </div>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr"
          >
            {filteredSalesmen.length > 0 ? (
              filteredSalesmen.map((salesman) => (
                <SalesmanCard
                  key={salesman._id}
                  salesman={salesman}
                  onAddSale={(s) => setPopup({ type: "add_sale", data: s })}
                  onViewSales={(s) => setPopup({ type: "view_sales", data: s })}
                  onDelete={(id) => setPopup({ type: "delete", data: id })}
                />
              ))
            ) : (
              <p className="col-span-3 text-center py-10">No salesmen found.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
