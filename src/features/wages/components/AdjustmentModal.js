"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarMinus, Save, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Collapse } from "@/components/ui/Collapse";
import { FilterButton } from "@/components/ui/FilterButton";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { ADJUSTMENT_LABELS, ADJUSTMENT_TYPES, leaveAmount, recoveryProblem, round2 } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { workerOptions } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

const HINTS = {
  leave: "Days off are cut at the worker's per-day salary.",
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
  if (form.type === "leave") {
    if (!(Number(form.days) > 0)) return "Leave days must be more than 0.";
    if (!(Number(form.rate) >= 0) || form.rate === "") return "Enter the per-day salary to cut.";
    return "";
  }
  if (!(Number(form.amount) > 0)) return "Amount must be more than 0.";
  return form.type === "recovery" ? recoveryProblem(form.amount, balance) : "";
};

/**
 * Records a leave (days × per-day salary), advance, advance cut, deduction or bonus for one worker.
 * Picking a worker prefills the per-day rate from their profile (editable here). For an advance or an advance cut
 * the worker's advance left is shown (`balanceOf`), and an advance cut can never be more than that.
 * `initial` ({ type, workerId }) opens the form preset, e.g. "Cut" from the advance account.
 */
export function AdjustmentModal({ workers, balanceOf = () => 0, initial, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [form, setForm] = useState(() => {
    const worker = workers.find((w) => String(w._id) === initial?.workerId);
    return {
      type: initial?.type ?? "leave",
      workerId: initial?.workerId ?? "",
      days: "1",
      rate: Number(worker?.dailyRate) > 0 ? String(worker.dailyRate) : "",
      amount: "",
      date: today(),
      note: "",
    };
  });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const isLeave = form.type === "leave";
  const isAdvanceForm = ADVANCE_FORMS.includes(form.type);
  const balance = form.workerId ? balanceOf(form.workerId) : 0;
  const problem = problemOf(form, balance);
  const leaveCut = leaveAmount(form.days, form.rate);
  const amount = Number(form.amount) || 0;
  const balanceAfter = round2(form.type === "advance" ? balance + amount : balance - amount);

  const selectWorker = (workerId) => {
    const worker = workers.find((w) => String(w._id) === workerId);
    setForm((prev) => ({
      ...prev,
      workerId,
      rate: Number(worker?.dailyRate) > 0 ? String(worker.dailyRate) : prev.rate,
    }));
  };

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
      <form onSubmit={handleSubmit} className="space-y-5" data-testid="adjustment-form">
        <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <CalendarMinus size={22} className="text-primary" /> Leave / Advance
        </h3>

        <div>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl" role="group">
            {ADJUSTMENT_TYPES.map((type) => (
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
        </div>

        <div data-testid="adjustment-worker">
          <span className={LABEL_CLASS}>Worker</span>
          <SelectDropdown
            options={workerOptions(workers)}
            selected={form.workerId}
            onSelect={selectWorker}
            placeholder={workers.length ? "Select worker" : "Add workers first"}
          />
        </div>

        <Collapse open={isLeave}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="adjustment-days" className={LABEL_CLASS}>
                Days off
              </label>
              <input
                id="adjustment-days"
                type="number"
                inputMode="decimal"
                min="0.5"
                step="0.5"
                value={form.days}
                onChange={(e) => set("days", e.target.value)}
                className={INPUT_CLASS}
                data-testid="adjustment-days"
              />
            </div>
            <div>
              <label htmlFor="adjustment-rate" className={LABEL_CLASS}>
                Per-day salary (Rs)
              </label>
              <input
                id="adjustment-rate"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.rate}
                onChange={(e) => set("rate", e.target.value)}
                placeholder="e.g. 1000"
                className={INPUT_CLASS}
                data-testid="adjustment-rate"
              />
            </div>
          </div>
        </Collapse>

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

        <Collapse open={!isLeave}>
          <div>
            <label htmlFor="adjustment-amount" className={LABEL_CLASS}>
              {form.type === "recovery" ? "Cut from this salary (Rs)" : "Amount (Rs)"}
            </label>
            <input
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
        </Collapse>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="adjustment-date" className={LABEL_CLASS}>
              {isLeave ? "First day off" : "Date"}
            </label>
            <input
              id="adjustment-date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="adjustment-note" className={LABEL_CLASS}>
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="adjustment-note"
              type="text"
              maxLength={500}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder={isLeave ? "e.g. sick" : "e.g. family need"}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-primary-soft">
          <p className="text-sm text-gray-700" data-testid="adjustment-total">
            {isLeave ? (
              <>
                {Number(form.days) || 0} day(s) × Rs {Number(form.rate) || 0} ={" "}
                <span className="font-bold text-primary">{formatMoney(leaveCut)}</span> cut
              </>
            ) : (
              <>
                {ADJUSTMENT_LABELS[form.type]}: <span className="font-bold text-primary">{formatMoney(amount)}</span>
                {isAdvanceForm && form.workerId && !problem && (
                  <span className="block text-xs text-gray-500" data-testid="adjustment-balance-after">
                    Advance left after this: {formatMoney(balanceAfter)}
                  </span>
                )}
              </>
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
