"use client";

import { TrendingDown } from "lucide-react";
import { lotShortfall } from "@/constants/lots";
import { formatQty, isShortfall } from "../utils";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

function DiffCell({ value }) {
  if (value === null || value === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={
        "inline-block min-w-12 px-2 py-0.5 rounded-md text-sm font-semibold " +
        (isShortfall(value) ? "bg-danger-soft text-danger" : "bg-success-soft text-success")
      }
    >
      {isShortfall(value) ? `-${value}` : value}
    </span>
  );
}

/** Cut → Stitched → Washed pieces with the loss at each step, highlighted when pieces went missing. */
export function ShortfallPanel({ lot }) {
  const shortfall = lotShortfall(lot);
  const rows = [
    { key: "cut", label: "Cut", qty: lot?.cutQty, diff: null },
    { key: "stitched", label: "Stitched", qty: lot?.stitchedQty, diff: shortfall.afterStitching },
    { key: "washed", label: "Washed", qty: lot?.washedQty, diff: shortfall.afterWashing },
  ];

  return (
    <div className={CARD_CLASS} data-testid="lot-shortfall" data-shortfall-total={shortfall.total ?? ""}>
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
        <TrendingDown size={18} className="text-primary" />
        Shortfall
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-1.5 font-semibold">Step</th>
            <th className="py-1.5 font-semibold text-right">Pieces</th>
            <th className="py-1.5 font-semibold text-right">Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className={`border-t border-gray-100 ${isShortfall(row.diff) ? "bg-danger-soft/60" : ""}`}
              data-testid="lot-shortfall-row"
              data-step={row.key}
            >
              <td className="py-2 font-medium text-gray-800">{row.label}</td>
              <td className="py-2 text-right text-gray-700">{formatQty(row.qty)}</td>
              <td className="py-2 text-right">
                <DiffCell value={row.diff} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200">
            <td className="py-2 font-bold text-gray-800" colSpan={2}>
              Total shortfall
            </td>
            <td className="py-2 text-right">
              <DiffCell value={shortfall.total} />
            </td>
          </tr>
        </tfoot>
      </table>
      {shortfall.total === null && (
        <p className="text-xs text-gray-400 mt-2">Differences appear once stitching and washing are recorded.</p>
      )}
    </div>
  );
}

export default ShortfallPanel;
