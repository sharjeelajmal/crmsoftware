"use client";

import { RecoveryRow } from "./RecoveryRow";

/** Pending payments table. */
export function RecoveryTable({ customers, onSaveBalance }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="p-3 sm:p-4 text-sm font-semibold text-gray-500">CUSTOMER</th>
            <th className="p-4 text-sm font-semibold text-gray-500 hidden sm:table-cell">TYPE</th>
            <th className="p-3 sm:p-4 text-sm font-semibold text-gray-500 text-right">TOTAL DUE</th>
          </tr>
        </thead>
        <tbody>
          {customers.length > 0 ? (
            customers.map((customer) => (
              <RecoveryRow
                key={customer._id || `${customer.name}-${customer.phone}`}
                customer={customer}
                onSaveBalance={onSaveBalance}
              />
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center py-10 text-gray-500">
                <p>Congratulations! No outstanding dues found.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RecoveryTable;
