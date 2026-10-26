"use client";

import { useState } from "react";
import { ListChecks, Plus, Scale, Trash2, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { assignmentProblem, workPiecesOf } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { useWorkers } from "../hooks/useWorkers";
import { useLotOperations } from "../hooks/useLotOperations";
import { assignmentTotal, emptyAssignment, operationOptions, splitRows, workerOptions } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Assigns one operation of a lot to one or more workers. The operations offered are the rate card of the lot's
 * category (else every active operation); the rate is prefilled from the card (editable for this assignment only);
 * pieces default to the lot's pieces and can be split evenly across the rows.
 */
export function AssignWorkModal({ lot, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const { workers } = useWorkers();
  const offer = useLotOperations(lot._id);
  const operations = offer.operations;
  const lotPieces = workPiecesOf(lot);
  const [form, setForm] = useState(() => emptyAssignment(lotPieces));

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setRow = (index, key, value) =>
    setForm((prev) => ({ ...prev, rows: prev.rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)) }));
  const addRow = () =>
    setForm((prev) => ({ ...prev, rows: splitRows([...prev.rows, { workerId: "", pieces: "" }], lotPieces) }));
  const removeRow = (index) => setForm((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== index) }));
  const selectOperation = (operationId) => {
    const operation = operations.find((op) => op.operationId === operationId);
    setForm((prev) => ({ ...prev, operationId, rate: operation ? String(operation.rate) : prev.rate }));
  };

  const problem = assignmentProblem(form);
  const total = assignmentTotal(form);
  const usedWorkers = new Set(form.rows.map((row) => row.workerId));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (problem) {
      toast.info(problem);
      return;
    }
    onSave(form);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="lg">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="assign-work-form">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <UserPlus size={22} className="text-primary" /> Assign work
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {lot.lotNumber} · {lot.productName} · {lotPieces} pcs in stitching
          </p>
          {!offer.isLoading && (
            <p
              className="mt-2 flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-gray-600"
              data-testid="assign-rate-card"
              data-from-card={offer.fromCard}
            >
              <ListChecks size={14} className="shrink-0 mt-0.5 text-primary" />
              {offer.fromCard ? (
                <span>
                  <b className="text-gray-800">{offer.category}</b> rate card: {operations.length} operations ·{" "}
                  {formatMoney(offer.perPiece)} per piece
                </span>
              ) : (
                <span>
                  {offer.category ? (
                    <>
                      <b className="text-gray-800">{offer.category}</b> has no rate card yet
                    </>
                  ) : (
                    "This article has no category"
                  )}{" "}
                  — every operation is shown at its own rate (Workers → Category rates).
                </span>
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
          <div data-testid="assign-operation">
            <span className={LABEL_CLASS}>Operation</span>
            <SelectDropdown
              options={operationOptions(operations)}
              selected={form.operationId}
              onSelect={selectOperation}
              placeholder={
                offer.isLoading
                  ? "Loading operations…"
                  : operations.length
                    ? "Select operation"
                    : "Add operations first (Workers → Operations)"
              }
            />
          </div>
          <div>
            <label htmlFor="assign-rate" className={LABEL_CLASS}>
              Rate (Rs / piece)
            </label>
            <input
              autoComplete="off"
              id="assign-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.rate}
              onChange={(e) => set("rate", e.target.value)}
              className={INPUT_CLASS}
              data-testid="assign-rate"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`${LABEL_CLASS} mb-0`}>Workers &amp; pieces</span>
            <button
              type="button"
              onClick={() => set("rows", splitRows(form.rows, lotPieces))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary cursor-pointer"
              data-testid="assign-split"
            >
              <Scale size={14} /> Split {lotPieces} evenly
            </button>
          </div>
          <div className="space-y-2">
            {form.rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_6rem_2rem] gap-2 items-center" data-testid="assign-row">
                <SelectDropdown
                  options={workerOptions(workers).filter(
                    (option) => option.value === row.workerId || !usedWorkers.has(option.value)
                  )}
                  selected={row.workerId}
                  onSelect={(workerId) => setRow(index, "workerId", workerId)}
                  placeholder={workers.length ? "Select worker" : "Add workers first"}
                />
                <input
                  autoComplete="off"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={row.pieces}
                  onChange={(e) => setRow(index, "pieces", e.target.value)}
                  aria-label="Pieces"
                  placeholder="pcs"
                  className={`${INPUT_CLASS} text-right`}
                  data-testid="assign-pieces"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={form.rows.length === 1}
                  aria-label="Remove worker"
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"
            data-testid="assign-add-worker"
          >
            <Plus size={16} /> Add worker
          </button>
        </div>

        <div>
          <label htmlFor="assign-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="assign-note"
            type="text"
            maxLength={500}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="e.g. second shift"
            className={INPUT_CLASS}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="assign-total" data-amount={total.amount}>
            <span className="font-semibold">{total.pieces} pcs</span> × Rs {Number(form.rate) || 0} ={" "}
            <span className="font-bold text-primary">{formatMoney(total.amount)}</span>
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              icon={UserPlus}
              disabled={isSaving || Boolean(problem)}
              className="flex-1 sm:flex-none"
              data-testid="assign-submit"
            >
              {isSaving ? "Saving…" : "Save work"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default AssignWorkModal;
