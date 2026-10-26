"use client";

const INPUT = "w-full text-right outline-none text-sm bg-transparent";

/** Totals block of the new invoice: read-only sums with editable others / discount / received. */
export function InvoiceTotals({ totals, charges, onChargeChange }) {
  return (
    <div className="flex justify-end mb-4">
      <table className="w-64 text-sm">
        <tbody>
          <tr>
            <td className="font-semibold pr-4">Sub Total:</td>
            <td className="text-right">{totals.subTotal.toFixed(0)}</td>
          </tr>
          <tr>
            <td className="font-semibold pr-4">Others:</td>
            <td>
              <input
                autoComplete="off"
                type="number"
                value={charges.others}
                onChange={(e) => onChargeChange("others", e.target.value)}
                className={INPUT}
              />
            </td>
          </tr>
          <tr>
            <td className="font-semibold pr-4">Discount:</td>
            <td>
              <input
                autoComplete="off"
                type="number"
                value={charges.discount}
                onChange={(e) => onChargeChange("discount", e.target.value)}
                className={INPUT}
              />
            </td>
          </tr>
          <tr className="font-bold text-md">
            <td className="pt-2 pr-4">Total:</td>
            <td className="pt-2 text-right">{totals.total.toFixed(0)}</td>
          </tr>
          <tr>
            <td className="font-semibold pr-4 pt-2">Received:</td>
            <td>
              <input
                autoComplete="off"
                type="number"
                value={charges.receivedAmount}
                onChange={(e) => onChargeChange("receivedAmount", e.target.value)}
                className={`${INPUT} pt-2`}
              />
            </td>
          </tr>
          <tr className="font-bold text-xl text-red-600">
            <td className="pt-2 pr-4">Balance:</td>
            <td className="pt-2 text-right">{totals.balance.toFixed(0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceTotals;
