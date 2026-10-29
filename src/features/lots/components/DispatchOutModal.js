"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SuggestInput } from "@/components/ui/SuggestInput";
import { dispatchBalance, dispatchCost, dispatchOutProblem, piecesOf } from "@/constants/dispatch";
import { formatMoney } from "@/lib/format";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Sends ready pieces out of the factory: where to (party / shop, with the ones used before suggested), how many of
 * each size (all that is left by default — any part is fine), an optional note, and the labour cost of those pieces.
 */
export function DispatchOutModal({ lot, parties = [], labour = 0, onSave, onCancel, isSaving = false }) {
  const balance = dispatchBalance(lot);
  const [form, setForm] = useState(() => ({
    party: "",
    note: "",
    sizes: balance.rows.map((row) => ({ size: row.size, qty: row.left ? String(row.left) : "" })),
  }));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setQty = (size, qty) =>
    setForm((prev) => ({ ...prev, sizes: prev.sizes.map((row) => (row.size === size ? { ...row, qty } : row)) }));
  const fillAll = () =>
    set(
      "sizes",
      balance.rows.map((row) => ({ size: row.size, qty: row.left ? String(row.left) : "" }))
    );

  const problem = dispatchOutProblem(lot, form);
  const pieces = piecesOf(form.sizes);
  const cost = dispatchCost({ labour, readyQty: balance.ready, pieces });
  const partyOptions = parties.map((name) => ({ value: name, label: name, name }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!problem) onSave(form);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="dispatch-out-form">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Truck size={22} className="text-primary" /> Dispatch
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {lot.lotNumber} · {lot.productName} · {balance.left} of {balance.ready} pcs still in the factory
          </p>
        </div>

        <div>
          <label htmlFor="dispatch-party" className={LABEL_CLASS}>
            Going to (party / shop)
          </label>
          <SuggestInput
            id="dispatch-party"
            value={form.party}
            onChange={(value) => set("party", value)}
            onPick={(option) => set("party", option.name)}
            options={partyOptions}
            placeholder="e.g. Al-Madina Garments"
            maxLength={120}
            className={INPUT_CLASS}
            testId="dispatch-party"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`${LABEL_CLASS} mb-0`}>Pieces going out</span>
            <button
              type="button"
              onClick={fillAll}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              data-testid="dispatch-all"
            >
              Send all that is left
            </button>
          </div>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_7rem] gap-3 px-3 py-2 bg-surface-muted text-xs font-semibold text-gray-500">
              <span>Size</span>
              <span className="text-right">In factory</span>
              <span className="text-right">Send now</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {balance.rows.map((row) => (
                <li
                  key={row.size}
                  className="grid grid-cols-[1fr_1fr_7rem] items-center gap-3 px-3 py-2 text-sm"
                  data-testid="dispatch-size-row"
                  data-size={row.size}
                >
                  <span className="font-semibold text-gray-800">{row.size}</span>
                  <span className="text-right tabular-nums text-gray-600">{row.left}</span>
                  <input
                    autoComplete="off"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={row.left}
                    step="1"
                    value={form.sizes.find((s) => s.size === row.size)?.qty ?? ""}
                    onChange={(e) => setQty(row.size, e.target.value)}
                    disabled={row.left === 0}
                    aria-label={`Pieces of size ${row.size}`}
                    className="w-full p-2 text-right bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                    data-testid="dispatch-qty"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <label htmlFor="dispatch-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="dispatch-note"
            type="text"
            maxLength={300}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. vehicle no., carton count"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="dispatch-total" data-pieces={pieces}>
            <span className="font-bold text-primary">{pieces} pcs</span> going out
            <span className="block text-xs text-gray-500">
              Labour {formatMoney(cost.perPiece)} a piece · {formatMoney(cost.amount)} for these
            </span>
            {problem && pieces > 0 && (
              // Until a party is typed this is a hint (grey); a wrong quantity is an error (red).
              <span
                className={`block text-xs font-medium ${form.party.trim() ? "text-danger" : "text-gray-500"}`}
                data-testid="dispatch-problem"
              >
                {problem}
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Truck}
              disabled={isSaving || Boolean(problem)}
              className="flex-1 sm:flex-none whitespace-nowrap"
              data-testid="dispatch-submit"
            >
              {isSaving ? "Saving…" : "Dispatch & print"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default DispatchOutModal;
