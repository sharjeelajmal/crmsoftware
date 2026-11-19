"use client";

import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMoney } from "@/lib/format";
import { useLotOperations } from "@/features/wages/hooks/useLotOperations";
import {
  cutOptions,
  cutRefOf,
  emptyKhataEntry,
  khataEntryAmount,
  khataEntryProblem,
  operationOptionsFor,
  withSuggestedRate,
} from "../utils";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const INPUT_CLASS = "w-full p-2.5 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const PAY_OPTIONS = [
  { value: "piece", label: "Per pc" },
  { value: "fixed", label: "Fixed" },
];

/**
 * One line of the stitching khata: which worker did how many pieces of which operation on which cut. The worker is
 * fixed on his khata page (`worker`), the cut on a cut's page (`cutValue`); the other is picked. The rate comes in by
 * itself — an invoice's rate card (as on its work sheet), else the operation's own rate — and can be typed over; the
 * wage shows as it is typed. After saving, the cut and operation stay for the next line.
 */
export function KhataEntryForm({
  worker = null,
  workers = [],
  cutValue = "",
  cuts = [],
  lots = [],
  operations = [],
  onSave,
  isSaving = false,
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => emptyKhataEntry({ workerId: worker?._id ?? "", cut: cutValue }));
  const chosenWorker = worker ?? workers.find((w) => String(w._id) === form.workerId) ?? null;
  const operationOptions = operationOptionsFor(operations, chosenWorker?.operationIds ?? []);
  const workerOptions = workers.filter((w) => w.active !== false).map((w) => ({ value: String(w._id), label: w.name }));
  const lotId = cutRefOf(form.cut).lotId ?? "";
  const lotWork = useLotOperations(lotId);
  const ratesLoading = Boolean(lotId) && lotWork.isLoading;
  const draft = withSuggestedRate(form, { operations, lotOperations: lotId ? lotWork.operations : [] });
  const problem = khataEntryProblem(draft);
  const amount = khataEntryAmount(draft);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const pickOperation = (operationId) => set({ operationId, rate: "", rateEdited: false });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (ratesLoading) return;
    if (problem) {
      toast.info(problem);
      return;
    }
    if (await onSave(draft)) {
      // the next line is usually the same cut and operation for another day or worker
      setForm((prev) => ({ ...emptyKhataEntry(prev), date: prev.date }));
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="@container bg-white p-4 sm:p-6 rounded-2xl shadow-sm space-y-4"
      data-testid="khata-entry-form"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
        <PackagePlus size={18} className="text-primary" /> Add work
      </h2>
      <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-4">
        {!worker && (
          <div data-testid="khata-entry-worker">
            <span className={LABEL_CLASS}>Worker</span>
            <SelectDropdown
              options={workerOptions}
              selected={form.workerId}
              onSelect={(workerId) => set({ workerId })}
              placeholder={workerOptions.length ? "Choose the worker" : "Add workers first"}
              ariaLabel="Worker"
              portal
            />
          </div>
        )}
        {!cutValue && (
          <div data-testid="khata-entry-cut">
            <span className={LABEL_CLASS}>Cut</span>
            <SelectDropdown
              options={cutOptions(cuts, lots)}
              selected={form.cut}
              onSelect={(cut) => set({ cut, rate: "", rateEdited: false })}
              placeholder={cuts.length || lots.length ? "Choose the cut" : "Add a cut first (Cuts tab)"}
              ariaLabel="Cut"
              portal
            />
          </div>
        )}
        <div data-testid="khata-entry-operation">
          <span className={LABEL_CLASS}>Operation</span>
          <SelectDropdown
            options={operationOptions}
            selected={form.operationId}
            onSelect={pickOperation}
            placeholder={operationOptions.length ? "Choose the operation" : "Add operations first (Workers)"}
            ariaLabel="Operation"
            portal
          />
        </div>
        <div>
          <label htmlFor="khata-entry-pieces" className={LABEL_CLASS}>
            Pieces
          </label>
          <input
            autoComplete="off"
            id="khata-entry-pieces"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.pieces}
            onChange={(e) => set({ pieces: e.target.value })}
            placeholder="e.g. 60"
            className={`${INPUT_CLASS} text-right`}
            data-testid="khata-entry-pieces"
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Pay</span>
          <SegmentedControl
            options={PAY_OPTIONS}
            value={form.payType}
            onChange={(payType) => set({ payType })}
            ariaLabel="Pay"
            className="w-full"
            testId="khata-entry-pay"
          />
        </div>
        {form.payType === "fixed" ? (
          <div>
            <label htmlFor="khata-entry-amount" className={LABEL_CLASS}>
              Fixed amount (Rs)
            </label>
            <input
              autoComplete="off"
              id="khata-entry-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="Rs total"
              className={`${INPUT_CLASS} text-right`}
              data-testid="khata-entry-amount"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="khata-entry-rate" className={LABEL_CLASS}>
              Rate (Rs / piece)
            </label>
            <input
              autoComplete="off"
              id="khata-entry-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={draft.rate}
              onChange={(e) => set({ rate: e.target.value, rateEdited: true })}
              placeholder="comes with the operation"
              className={`${INPUT_CLASS} text-right`}
              data-testid="khata-entry-rate"
            />
          </div>
        )}
        <div>
          <label htmlFor="khata-entry-date" className={LABEL_CLASS}>
            Date
          </label>
          <DatePickerField id="khata-entry-date" value={form.date} onChange={(date) => set({ date })} />
        </div>
        <div className="@2xl:col-span-2">
          <label htmlFor="khata-entry-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="khata-entry-note"
            type="text"
            maxLength={500}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="e.g. second shift"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-primary-soft p-3">
        <p className="text-sm text-gray-700" data-testid="khata-entry-total" data-amount={amount}>
          {form.payType === "fixed"
            ? "Fixed"
            : `${Math.trunc(Number(draft.pieces)) || 0} pcs × Rs ${Number(draft.rate) || 0}`}{" "}
          = <span className="text-lg font-bold text-primary">{formatMoney(amount)}</span>
        </p>
        <Button
          type="submit"
          icon={PackagePlus}
          disabled={isSaving || ratesLoading || Boolean(problem)}
          className="w-full sm:w-auto"
          data-testid="khata-entry-submit"
        >
          {isSaving ? "Saving…" : ratesLoading ? "Loading rates…" : "Add work"}
        </Button>
      </div>
    </form>
  );
}

export default KhataEntryForm;
