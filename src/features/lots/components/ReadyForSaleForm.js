"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PackageCheck, RotateCcw, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { formatDateTime } from "@/lib/format";
import {
  STAGE_ACTIONS,
  STAGE_LABELS,
  cutQtyOf,
  distributeBySizes,
  lotShortfall,
  readySizesProblem,
} from "@/constants/lots";
import { useStageAction } from "../hooks/useStageAction";

const ACTION_KEY = "ready";
const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";
const INPUT_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";
const SIZE_INPUT_CLASS =
  "w-20 sm:w-24 px-2 py-1.5 text-right bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

const toRows = (sizes, qty) => distributeBySizes(sizes, qty).map((row) => ({ size: row.size, qty: String(row.qty) }));

/**
 * Packing → Ready for Sale. Records the finished pieces, their per-size split (prefilled in proportion to the
 * cut quantities and re-split whenever the total changes, until a row is edited by hand) and adds them to the
 * product's stock after an explicit confirmation. Calls `onUpdated(lot)` once the server has applied the stock.
 */
export function ReadyForSaleForm({ lot, onUpdated }) {
  const action = STAGE_ACTIONS[ACTION_KEY];
  const max = Number(lot?.washedQty) || 0;
  const { runAction, isSubmitting } = useStageAction();
  const [qty, setQty] = useState("");
  const [rows, setRows] = useState([]);
  const [rowsEdited, setRowsEdited] = useState(false);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);

  // Start from the pieces that came back from washing, split across the lot's sizes.
  useEffect(() => {
    const start = lotShortfall(lot).lastQty ?? 0;
    setQty(String(start));
    setRows(toRows(lot?.sizes, start));
    setRowsEdited(false);
    setNote("");
    setConfirming(false);
  }, [lot?._id, lot?.stage]); // eslint-disable-line react-hooks/exhaustive-deps -- lot object identity changes on refresh

  const pieces = Math.trunc(Number(qty));
  const qtyValid = qty !== "" && Number.isFinite(pieces) && pieces >= 0 && pieces <= max;
  const total = cutQtyOf(rows);
  const problem = qtyValid ? readySizesProblem(lot, rows, pieces) : null;
  const canSubmit = qtyValid && !problem && !isSubmitting;

  const handleQtyChange = (value) => {
    setQty(value);
    if (!rowsEdited) setRows(toRows(lot?.sizes, Math.trunc(Number(value)) || 0));
  };

  const handleRowChange = (size, value) => {
    setRowsEdited(true);
    setRows((prev) => prev.map((row) => (row.size === size ? { ...row, qty: value } : row)));
  };

  const resetSplit = () => {
    setRows(toRows(lot?.sizes, pieces || 0));
    setRowsEdited(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (canSubmit) setConfirming(true);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    const updated = await runAction(lot, ACTION_KEY, { qty: pieces, sizes: rows, note });
    setConfirming(false);
    if (updated) onUpdated?.(updated);
  };

  return (
    <form onSubmit={handleSubmit} className={CARD_CLASS} data-testid="lot-stage-panel" data-action={ACTION_KEY}>
      <div data-testid="lot-ready-confirm-dialog">
        <AnimatePresence>
          {confirming && (
            <ConfirmDialog
              title="Add to stock?"
              message={`${pieces} pieces of ${lot.productName} will be added to stock and ${lot.lotNumber} marked ready.`}
              confirmLabel={isSubmitting ? "Adding…" : "Add to stock"}
              confirmTestId="lot-ready-confirm"
              tone="primary"
              onConfirm={handleConfirm}
              onCancel={() => !isSubmitting && setConfirming(false)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <PackageCheck size={18} className="text-primary" />
          Ready for Sale
        </h2>
        <p className="text-sm text-gray-500">
          Current stage: <span className="font-semibold text-gray-800">{STAGE_LABELS[lot.stage]}</span>
          <span className="mx-1.5">→</span>
          <span className="font-semibold text-primary">{STAGE_LABELS[action.to]}</span>
        </p>
      </div>

      {lot.reverseReason ? (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800"
          data-testid="lot-reversed-info"
        >
          <Undo2 size={16} className="mt-0.5 shrink-0" />
          <p className="break-words">
            Stock was reversed on {formatDateTime(lot.reversedAt)}:{" "}
            <span className="font-semibold">{lot.reverseReason}</span>
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="lot-ready-qty" className="block text-sm font-medium text-gray-700 mb-1">
            Finished pieces <span className="text-gray-400">(max {max})</span>
          </label>
          <input
            id="lot-ready-qty"
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            step={1}
            value={qty}
            onChange={(e) => handleQtyChange(e.target.value)}
            className={INPUT_CLASS}
            data-testid="lot-ready-qty"
            required
          />
          <p className="text-xs mt-1.5 text-gray-500">
            {qtyValid && max - pieces > 0
              ? `Shortfall at packing: ${max - pieces} pcs`
              : `${max} pieces came back from washing.`}
          </p>
        </div>
        <div>
          <label htmlFor="lot-ready-note" className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="lot-ready-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 2 pieces kept as samples"
            className={INPUT_CLASS}
            data-testid="lot-stage-note"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-gray-700">Pieces per size</p>
          {rowsEdited && (
            <button
              type="button"
              onClick={resetSplit}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
              data-testid="lot-ready-redistribute"
            >
              <RotateCcw size={12} /> Split in proportion
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-1.5 font-semibold">Size</th>
              <th className="py-1.5 font-semibold text-right">Cut</th>
              <th className="py-1.5 font-semibold text-right">Ready</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cut = lot.sizes?.find((s) => s.size === row.size)?.qty ?? 0;
              return (
                <tr
                  key={row.size}
                  className="border-t border-gray-100"
                  data-testid="lot-ready-size-row"
                  data-size={row.size}
                >
                  <td className="py-1.5 font-medium text-gray-800">{row.size}</td>
                  <td className="py-1.5 text-right text-gray-500">{cut}</td>
                  <td className="py-1.5 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={row.qty}
                      onChange={(e) => handleRowChange(row.size, e.target.value)}
                      aria-label={`Ready pieces for size ${row.size}`}
                      className={SIZE_INPUT_CLASS}
                      data-testid="lot-ready-size-qty"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="py-2 font-bold text-gray-800" colSpan={2}>
                Total
              </td>
              <td
                className={`py-2 text-right font-bold ${problem ? "text-danger" : "text-primary"}`}
                data-testid="lot-ready-total"
                data-total={total}
              >
                {total} / {qtyValid ? pieces : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
        {problem ? <p className="text-xs mt-1.5 text-danger font-semibold">{problem}</p> : null}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <p className="text-sm text-gray-700 rounded-lg bg-primary-soft px-3 py-2" data-testid="lot-ready-summary">
          This will add <span className="font-bold text-primary">{qtyValid ? pieces : 0} pieces</span> to{" "}
          <span className="font-semibold">{lot.productName}</span> stock.
        </p>
        <Button
          type="submit"
          icon={PackageCheck}
          disabled={!canSubmit}
          className="w-full sm:w-auto shrink-0"
          data-testid="lot-stage-action"
        >
          {isSubmitting ? "Adding…" : action.label}
        </Button>
      </div>
    </form>
  );
}

export default ReadyForSaleForm;
