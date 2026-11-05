"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ListChecks, Plus, Save, Scale, Trash2, Users } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/ToastProvider";
import { MAIN_OPERATION_LABELS } from "@/constants/operations";
import { rowAmount, workPiecesOf, workSheetProblem, workSheetTotals } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { useWorkers } from "../hooks/useWorkers";
import { useLotOperations } from "../hooks/useLotOperations";
import { useLotWork } from "../hooks/useLotWork";
import { emptyWorkSheet, fillWorker, sheetRow, splitOperation, workerOptions } from "../utils";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const INPUT_CLASS = "w-full p-2.5 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const PAY_OPTIONS = [
  { value: "piece", label: "Per pc" },
  { value: "fixed", label: "Fixed" },
];

/**
 * The work sheet of an invoice: every operation it needs (its category's rate card, else every active operation)
 * with the worker(s), pieces and pay of each, saved in one go. Pieces start at what is still left of each
 * operation; "one worker for every open operation" fills the sheet for a single karigar.
 */
export function WorkSheet({ lot, backHref, onSaved }) {
  const offer = useLotOperations(lot._id);
  const work = useLotWork(lot);
  const { workers, isLoading: workersLoading } = useWorkers();

  if (offer.isLoading || work.isLoading || workersLoading) return <Loader inline />;
  return (
    <WorkSheetForm
      lot={lot}
      offer={offer}
      entries={work.entries}
      workers={workers}
      onAssign={work.assign}
      isSaving={work.isSaving}
      backHref={backHref}
      onSaved={onSaved}
    />
  );
}

function WorkSheetForm({ lot, offer, entries, workers, onAssign, isSaving, backHref, onSaved }) {
  const toast = useToast();
  const lotPieces = workPiecesOf(lot);
  const [sheet, setSheet] = useState(() => emptyWorkSheet(offer.operations, entries, lotPieces));
  const options = workerOptions(workers);
  const problem = workSheetProblem(sheet);
  const totals = workSheetTotals(sheet);

  const setField = (key, value) => setSheet((prev) => ({ ...prev, [key]: value }));
  const updateOperation = (operationId, change) =>
    setSheet((prev) => ({
      ...prev,
      operations: prev.operations.map((op) => (op.operationId === operationId ? change(op) : op)),
    }));
  const setRow = (operationId, index, patch) =>
    updateOperation(operationId, (op) => ({
      ...op,
      rows: op.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  const addRow = (operationId) =>
    updateOperation(operationId, (op) => splitOperation({ ...op, rows: [...op.rows, sheetRow()] }));
  // The last row is cleared rather than removed, so every operation keeps a row to pick a worker in.
  const removeRow = (operationId, index) =>
    updateOperation(operationId, (op) => ({
      ...op,
      rows: op.rows.length > 1 ? op.rows.filter((_, i) => i !== index) : [sheetRow(op.left)],
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (problem) {
      toast.info(problem);
      return;
    }
    if (await onAssign(sheet)) onSaved?.();
  };

  if (sheet.operations.length === 0 || options.length === 0) {
    return (
      <motion.div variants={itemVariants} className={`${CARD_CLASS} text-center space-y-3`} data-testid="sheet-empty">
        <p className="text-gray-600">
          {sheet.operations.length === 0
            ? "No operations yet. Add each operation with its rate first."
            : "No workers yet. Add the workers first."}
        </p>
        <Link href="/workers" className="inline-block text-sm font-semibold text-primary">
          Open Workers &amp; Rates
        </Link>
      </motion.div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" data-testid="work-sheet">
      <motion.div variants={itemVariants} className={`${CARD_CLASS} space-y-4`}>
        <p
          className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2 text-xs text-gray-600"
          data-testid="sheet-rate-card"
          data-from-card={offer.fromCard}
        >
          <ListChecks size={14} className="shrink-0 mt-0.5 text-primary" />
          {offer.fromCard ? (
            <span>
              <b className="text-gray-800">{offer.category}</b> rate card: {sheet.operations.length} operations ·{" "}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sheet-date" className={LABEL_CLASS}>
              Date
            </label>
            <DatePickerField
              id="sheet-date"
              value={sheet.date}
              onChange={(value) => setField("date", value)}
              testId="sheet-date"
            />
          </div>
          <div data-testid="sheet-fill">
            <span className={LABEL_CLASS}>One worker for every open operation</span>
            <SelectDropdown
              options={options}
              selected=""
              onSelect={(workerId) => setSheet((prev) => fillWorker(prev, workerId))}
              placeholder="Choose a worker (optional)"
              ariaLabel="One worker for every open operation"
            />
          </div>
          <div>
            <label htmlFor="sheet-note" className={LABEL_CLASS}>
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <input
              autoComplete="off"
              id="sheet-note"
              type="text"
              maxLength={500}
              value={sheet.note}
              onChange={(e) => setField("note", e.target.value)}
              placeholder="e.g. second shift"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={`@container ${CARD_CLASS} space-y-3`}
        data-testid="sheet-operations"
      >
        {sheet.operations.map((op, index) => (
          <div key={op.operationId}>
            {sheet.operations[index - 1]?.stage !== op.stage && (
              <h2 className="pt-1 pb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                {MAIN_OPERATION_LABELS[op.stage] ?? op.stage}
              </h2>
            )}
            <SheetOperation
              op={op}
              lotPieces={lotPieces}
              options={options}
              onRate={(rate) => updateOperation(op.operationId, (prev) => ({ ...prev, rate }))}
              onRow={(rowIndex, patch) => setRow(op.operationId, rowIndex, patch)}
              onAddRow={() => addRow(op.operationId)}
              onRemoveRow={(rowIndex) => removeRow(op.operationId, rowIndex)}
              onSplit={() => updateOperation(op.operationId, splitOperation)}
            />
          </div>
        ))}
      </motion.div>

      {/* One line even on a phone, so the sheet keeps the screen; "Back" at the top replaces Cancel there. */}
      <div className="sticky bottom-0 z-20 pb-1">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white shadow-lg border border-gray-100">
          <div
            className="min-w-0"
            data-testid="sheet-total"
            data-amount={totals.amount}
            data-workers={totals.workers}
            data-operations={totals.operations}
          >
            <p className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <Users size={16} className="shrink-0 text-primary" />
              <span>
                <b className="text-gray-800">{totals.workers}</b> {totals.workers === 1 ? "worker" : "workers"} ·{" "}
                <b className="text-gray-800">{totals.operations}</b> {totals.operations === 1 ? "op" : "ops"}
              </span>
            </p>
            <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums">{formatMoney(totals.amount)}</p>
            {problem && totals.rows > 0 && (
              <p className="text-xs font-medium text-danger" data-testid="sheet-problem">
                {problem}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-3">
            <Link href={backHref} className="hidden sm:block">
              <Button variant="secondary" disabled={isSaving}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              icon={Save}
              disabled={isSaving || Boolean(problem)}
              className="whitespace-nowrap"
              data-testid="sheet-submit"
            >
              {isSaving ? "Saving…" : "Save work"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** One operation of the sheet: rate, what is done / left, and its worker rows. */
function SheetOperation({ op, lotPieces, options, onRate, onRow, onAddRow, onRemoveRow, onSplit }) {
  const picked = new Set(op.rows.map((row) => row.workerId).filter(Boolean));
  return (
    <section
      className="rounded-2xl border border-gray-100 p-3 sm:p-4"
      data-testid="sheet-op"
      data-operation={op.name}
      data-left={op.left}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 [overflow-wrap:anywhere]">{op.name}</p>
          <p className="text-xs text-gray-500">
            {op.left > 0 ? (
              `${op.done} of ${lotPieces} pcs done · ${op.left} left`
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <Check size={12} strokeWidth={3} /> All {lotPieces} pcs done
              </span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Rs
          <input
            autoComplete="off"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={op.rate}
            onChange={(e) => onRate(e.target.value)}
            aria-label={`${op.name} rate per piece`}
            className="w-20 p-2 text-right bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-primary"
            data-testid="sheet-rate"
          />
          / pc
        </label>
      </div>

      <div className="space-y-2">
        {op.rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_2.25rem] @2xl:grid-cols-[minmax(0,1fr)_5.5rem_auto_7.5rem_2.25rem] gap-2 items-center"
            data-testid="sheet-row"
          >
            <div className="col-start-1 row-start-1 @2xl:col-auto @2xl:row-auto min-w-0">
              <SelectDropdown
                options={options.filter((option) => option.value === row.workerId || !picked.has(option.value))}
                selected={row.workerId}
                onSelect={(workerId) => onRow(index, { workerId })}
                placeholder="Select worker"
                ariaLabel={`${op.name} worker`}
                testId="sheet-worker"
              />
            </div>
            <div className="col-span-2 row-start-2 grid grid-cols-[5rem_auto_minmax(0,1fr)] gap-2 items-center @2xl:contents">
              <input
                autoComplete="off"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={row.pieces}
                onChange={(e) => onRow(index, { pieces: e.target.value })}
                aria-label={`${op.name} pieces`}
                placeholder="pcs"
                className={`${INPUT_CLASS} text-right`}
                data-testid="sheet-pieces"
              />
              <SegmentedControl
                size="sm"
                options={PAY_OPTIONS}
                value={row.payType}
                onChange={(payType) => onRow(index, { payType })}
                ariaLabel={`${op.name} pay`}
                testId="sheet-pay"
              />
              {row.payType === "fixed" ? (
                <input
                  autoComplete="off"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={row.amount}
                  onChange={(e) => onRow(index, { amount: e.target.value })}
                  aria-label={`${op.name} fixed amount`}
                  placeholder="Rs total"
                  className={`${INPUT_CLASS} text-right`}
                  data-testid="sheet-amount"
                />
              ) : (
                <span className="text-right font-semibold text-gray-800 tabular-nums" data-testid="sheet-row-amount">
                  {formatMoney(rowAmount({ ...row, rate: op.rate }))}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemoveRow(index)}
              aria-label={op.rows.length > 1 ? "Remove worker" : "Clear row"}
              data-tip={op.rows.length > 1 ? "Remove worker" : "Clear row"}
              className="col-start-2 row-start-1 @2xl:col-auto @2xl:row-auto w-9 h-9 grid place-items-center rounded-lg text-gray-400 hover:text-danger hover:bg-danger-soft cursor-pointer"
              data-testid="sheet-remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          onClick={onAddRow}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"
          data-testid="sheet-add-worker"
        >
          <Plus size={16} /> Add worker
        </button>
        {op.rows.length > 1 && op.left > 0 && (
          <button
            type="button"
            onClick={onSplit}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary cursor-pointer"
            data-testid="sheet-split"
          >
            <Scale size={14} /> Split {op.left} evenly
          </button>
        )}
      </div>
    </section>
  );
}

export default WorkSheet;
