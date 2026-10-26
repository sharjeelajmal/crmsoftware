"use client";

import { FileText, Receipt, Save } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { useCustomerSales } from "../hooks/useCustomers";

const invoiceLabel = (n) => String(n ?? 0).padStart(4, "0");

/** Sales history of one customer with "view invoice" / "save PDF" actions per row. */
export function ViewSalesPopup({ customerName, onClose, onViewInvoice, onSavePdf }) {
  const { sales, isLoading } = useCustomerSales(customerName);

  return (
    <Modal onClose={onClose} size="lg" padded={false}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center mb-4 sm:mb-6">
          <Receipt size={24} className="text-primary mr-3" />
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Sales History</h3>
            <p className="text-gray-500">For {customerName}</p>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto overflow-x-auto sm:pr-2">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading sales...</p>
          ) : sales.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-sm text-gray-500">Invoice #</th>
                  <th className="p-2 text-sm text-gray-500 hidden sm:table-cell">Date</th>
                  <th className="p-2 text-sm text-gray-500 text-right">Amount</th>
                  <th className="p-2 text-sm text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id} className="border-b hover:bg-gray-50 cursor-default">
                    <td className="p-3 font-medium text-gray-700">
                      {invoiceLabel(sale.invoiceNumber)}
                      <span className="block text-xs text-gray-400 sm:hidden">
                        {format(new Date(sale.invoiceDate), "dd MMM, yyyy")}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 hidden sm:table-cell">
                      {format(new Date(sale.invoiceDate), "dd MMM, yyyy")}
                    </td>
                    <td className="p-3 font-bold text-gray-800 text-right">
                      {(Number(sale.subTotal) || 0).toFixed(0)}/-
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => onViewInvoice(sale)}
                          data-tip="View Invoice"
                          aria-label="View Invoice"
                          className="text-gray-500 hover:text-blue-600 cursor-pointer"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSavePdf(sale)}
                          data-tip="Save as PDF"
                          aria-label="Save as PDF"
                          className="text-gray-500 hover:text-green-600 cursor-pointer"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">No sales found for this customer.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default ViewSalesPopup;
