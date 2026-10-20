"use client";

import { FileText, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useSalesmanSales } from "../hooks/useSalesmen";

/** Lists every sale linked to `salesman` with view / PDF actions. */
export function SalesHistoryPopup({ salesman, onCancel, onViewInvoice, onSavePdf }) {
  const { sales, isLoading } = useSalesmanSales(salesman._id);

  return (
    <Modal onClose={onCancel} size="lg">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Sales History</h3>
      <p className="text-gray-500 mb-6">for {salesman.name}</p>
      <div className="max-h-96 overflow-y-auto sm:pr-2">
        {isLoading ? (
          <p>Loading...</p>
        ) : sales.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-2">Inv #</th>
                <th className="p-2 hidden sm:table-cell">Customer</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id} className="border-b">
                  <td className="p-3">
                    {sale.invoiceNumber}
                    <span className="block text-xs text-gray-400 sm:hidden">{sale.customerName}</span>
                  </td>
                  <td className="p-3 hidden sm:table-cell">{sale.customerName}</td>
                  <td className="p-3 text-right font-bold">{(Number(sale.subTotal) || 0).toFixed(0)}/-</td>
                  <td className="p-3">
                    <div className="flex justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(sale)}
                        title="View Invoice"
                        className="text-gray-500 hover:text-blue-600 cursor-pointer"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSavePdf(sale)}
                        title="Save as PDF"
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
          <p className="text-center py-8 text-gray-500">No sales found for this salesman.</p>
        )}
      </div>
    </Modal>
  );
}
