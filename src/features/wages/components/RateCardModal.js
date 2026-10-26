"use client";

import { useState } from "react";
import { Check, ListChecks, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { MAIN_OPERATIONS, MAIN_OPERATION_LABELS, rateCardProblem, rateCardTotal } from "@/constants/operations";
import { formatMoney } from "@/lib/format";
import { rateCardRows } from "../utils";

const RATE_CLASS =
  "w-24 p-2 text-right bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-40";

/** A square check button (role="checkbox") — the app's own, never the browser's checkbox. */
function CheckButton({ checked, onChange, label, testId }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`grid place-items-center w-6 h-6 shrink-0 rounded-md border-2 transition-colors cursor-pointer ${
        checked ? "bg-primary border-primary text-white" : "bg-white border-gray-300 hover:border-primary"
      }`}
      data-testid={testId}
    >
      {checked && <Check size={14} strokeWidth={3} />}
    </button>
  );
}

/**
 * Edits one category's rate card: tick the operations a garment of this category needs and type the rate of each
 * for it (prefilled from the operation's own rate). "Copy from" starts from another category's card. Saving with
 * nothing ticked removes the card (then every operation is offered for this category).
 */
export function RateCardModal({ category, operations, items, otherCards = [], onSave, onCancel, isSaving = false }) {
  const [rows, setRows] = useState(() => rateCardRows(operations, items));
  const chosen = rows.filter((row) => row.chosen);
  const problem = rateCardProblem(chosen);
  const total = rateCardTotal(chosen.map((row) => ({ rate: Number(row.rate) || 0 })));
  const copyOptions = otherCards.map((card) => ({
    value: card.category,
    label: `${card.category} (${card.items.length})`,
  }));

  const setRow = (operationId, patch) =>
    setRows((prev) => prev.map((row) => (row.operationId === operationId ? { ...row, ...patch } : row)));
  const setGroup = (stage, chosenValue) =>
    setRows((prev) => prev.map((row) => (row.stage === stage ? { ...row, chosen: chosenValue } : row)));
  const copyFrom = (name) => {
    const card = otherCards.find((c) => c.category === name);
    if (card) setRows(rateCardRows(operations, card.items));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!problem) onSave(rows);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="rate-card-form">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <ListChecks size={22} className="text-primary" /> {category}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Tick every operation this category needs and the rate per piece for it.
          </p>
        </div>

        {copyOptions.length > 0 && (
          <div data-testid="rate-card-copy">
            <span className="block text-sm font-medium text-gray-700 mb-1">Copy from another category</span>
            <SelectDropdown
              options={copyOptions}
              selected=""
              onSelect={copyFrom}
              placeholder="Choose a category to copy"
              portal
            />
          </div>
        )}

        {rows.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-gray-500">
            No operations yet. Add them on the “Operations &amp; rates” tab first.
          </p>
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {MAIN_OPERATIONS.map((stage) => {
              const group = rows.filter((row) => row.stage === stage);
              if (group.length === 0) return null;
              const allChosen = group.every((row) => row.chosen);
              return (
                <section key={stage} data-testid="rate-card-group" data-stage={stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                      {MAIN_OPERATION_LABELS[stage]}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setGroup(stage, !allChosen)}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      {allChosen ? "Clear all" : "Tick all"}
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                    {group.map((row) => (
                      <li
                        key={row.operationId}
                        className="flex items-center gap-3 px-3 py-2"
                        data-testid="rate-card-row"
                        data-operation={row.name}
                      >
                        <CheckButton
                          checked={row.chosen}
                          onChange={(value) => setRow(row.operationId, { chosen: value })}
                          label={`${row.name} needed`}
                          testId="rate-card-check"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-gray-800 truncate">{row.name}</span>
                          <span className="block text-xs text-gray-500">Default Rs {row.defaultRate}</span>
                        </span>
                        <input
                          autoComplete="off"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={row.rate}
                          disabled={!row.chosen}
                          onChange={(e) => setRow(row.operationId, { rate: e.target.value })}
                          aria-label={`${row.name} rate`}
                          className={RATE_CLASS}
                          data-testid="rate-card-rate"
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="rate-card-total" data-total={total}>
            {chosen.length} operation{chosen.length === 1 ? "" : "s"} ·{" "}
            <span className="font-bold text-primary">{formatMoney(total)}</span> per piece
            {problem && <span className="block text-xs font-medium text-danger">{problem}</span>}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Save}
              disabled={isSaving || Boolean(problem)}
              className="flex-1 sm:flex-none"
              data-testid="rate-card-submit"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default RateCardModal;
