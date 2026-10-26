"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarCheck, Save, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FilterButton } from "@/components/ui/FilterButton";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useToast } from "@/components/ui/ToastProvider";
import { ADJUSTMENT_LABELS, MANUAL_ADJUSTMENT_TYPES, recoveryProblem, round2 } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { workerOptions } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

const HINTS = {
  advance: "Goes into the worker's advance account. Nothing is cut from the salary until you record an Advance cut.",
  recovery: "Cut from this period's salary. Whatever is not cut stays in the advance account for later.",
  deduction: "One-time cut (e.g. damaged pieces).",
  bonus: "Added to the salary.",
};

const ADVANCE_FORMS = ["advance", "recovery"];

const today = () => format(new Date(), "yyyy-MM-dd");

/** Why the form can't be saved yet, or "". `balance` = the worker's advance still left. */
const problemOf = (form, balance) => {
  if (!form.workerId) return "Please choose a worker.";
  if (!(Number(form.amount) > 0)) return "Amount must be more than 0.";
  return form.type === "recovery" ? recoveryProblem(form.amount, balance) : "";
};

/**
 * Records an advance, advance cut, deduction or bonus for one worker. Leave and absent days are marked on the
 * Attendance page (they cut the worker's per-day salary there). For an advance or an advance cut the worker's
 * advance left is shown (`balanceOf`), and an advance cut can never be more than that.
 * `initial` ({ type, workerId }) opens the form preset, e.g. "Cut" from the advance account.
 */
export function AdjustmentModal({ workers, balanceOf = () => 0, initial, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    type: MANUAL_ADJUSTMENT_TYPES.includes(initial?.type) ? initial.type : "advance",
    workerId: initial?.workerId ?? "",
    amount: "",
    date: today(),
    note: "",
  }));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isAdvanceForm = ADVANCE_FORMS.includes(form.type);
  const balance = form.workerId ? balanceOf(form.workerId) : 0;
  const problem = problemOf(form, balance);
  const amount = Number(form.amount) || 0;
  const balanceAfter = round2(form.type === "advance" ? balance + amount : balance - amount);

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
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="adjustment-form">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <Wallet size={22} className="text-primary" /> Advance / Deduction
        </h3>

        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl" role="group">
            {MANUAL_ADJUSTMENT_TYPES.map((type) => (
              <FilterButton
                key={type}
                label={ADJUSTMENT_LABELS[type]}
                active={form.type === type}
                aria-pressed={form.type === type}
                onClick={() => set("type", type)}
                wrap
                data-testid={`adjustment-type-${type}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{HINTS[form.type]}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <CalendarCheck size={14} className="shrink-0 text-primary" />
            <span>
              Leave and absent days are marked on{" "}
              <Link href="/attendance" className="font-semibold text-primary hover:underline">
                Attendance
              </Link>{" "}
              — they cut the per-day salary by themselves.
            </span>
          </p>
        </div>

        <div data-testid="adjustment-worker">
          <span className={LABEL_CLASS}>Worker</span>
          <SelectDropdown
            options={workerOptions(workers)}
            selected={form.workerId}
            onSelect={(workerId) => set("workerId", workerId)}
            placeholder={workers.length ? "Select worker" : "Add workers first"}
          />
        </div>

        <Collapse open={isAdvanceForm && Boolean(form.workerId)}>
          <div
            className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-white"
            data-testid="adjustment-balance"
            data-balance={balance}
          >
            <p className="flex items-center gap-2 text-sm text-gray-700">
              <Wallet size={16} className="text-primary" />
              Advance left: <span className="font-bold text-gray-800">{formatMoney(balance)}</span>
            </p>
            {form.type === "recovery" && balance > 0 && (
              <button
                type="button"
                onClick={() => set("amount", String(balance))}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                data-testid="adjustment-cut-all"
              >
                Cut all ({formatMoney(balance)})
              </button>
            )}
          </div>
        </Collapse>

        <div>
          <label htmlFor="adjustment-amount" className={LABEL_CLASS}>
            {form.type === "recovery" ? "Cut from this salary (Rs)" : "Amount (Rs)"}
          </label>
          <input
            autoComplete="off"
            id="adjustment-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
            className={INPUT_CLASS}
            data-testid="adjustment-amount"
          />
          {form.type === "recovery" && amount > 0 && problem && (
            <p className="mt-1 text-xs font-medium text-danger" data-testid="adjustment-problem">
              {problem}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="adjustment-date" className={LABEL_CLASS}>
              Date
            </label>
            <DatePickerField
              id="adjustment-date"
              value={form.date}
              onChange={(value) => set("date", value)}
              testId="adjustment-date"
            />
          </div>
          <div>
            <label htmlFor="adjustment-note" className={LABEL_CLASS}>
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <input
              autoComplete="off"
              id="adjustment-note"
              type="text"
              maxLength={500}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="e.g. family need"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="adjustment-total">
            {ADJUSTMENT_LABELS[form.type]}: <span className="font-bold text-primary">{formatMoney(amount)}</span>
            {isAdvanceForm && form.workerId && !problem && (
              <span className="block text-xs text-gray-500" data-testid="adjustment-balance-after">
                Advance left after this: {formatMoney(balanceAfter)}
              </span>
            )}
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
              data-testid="adjustment-submit"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default AdjustmentModal;
