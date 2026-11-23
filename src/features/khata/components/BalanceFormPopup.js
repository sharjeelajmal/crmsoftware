"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Scale } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/ToastProvider";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";
const WHO = [
  { value: "owner", label: "I give him (baqaya)" },
  { value: "worker", label: "He gives me (advance)" },
];

/**
 * An old balance from the notebook (client, 2026-11-22): money the owner still gives the worker joins his baqaya (his
 * next payment brings it in); money the worker gives back is an advance (cut like any advance — client, 2026-11-23).
 */
export function BalanceFormPopup({ workerName, onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [form, setForm] = useState({ owedBy: "owner", amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" });
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!(Number(form.amount) > 0)) {
      toast.info("Type the amount.");
      return;
    }
    if (await onSave(form)) onCancel();
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel}>
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="balance-form">
        <h3 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800 mb-2">
          <Scale size={22} className="text-primary" /> Old balance · {workerName}
        </h3>
        <p className="text-sm text-gray-600 text-center">
          {form.owedBy === "owner"
            ? "From the copy: money you still have to give him. It joins his baqaya and is paid with his next payment."
            : "From the copy: money he has to give you back. It goes to his advance and is cut like any advance."}
        </p>
        <SegmentedControl
          options={WHO}
          value={form.owedBy}
          onChange={(owedBy) => set({ owedBy })}
          ariaLabel="Who owes"
          className="w-full"
          testId="balance-form-who"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="balance-form-amount" className={LABEL_CLASS}>
              Amount (Rs)
            </label>
            <input
              autoComplete="off"
              id="balance-form-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
              placeholder="e.g. 500"
              className={`${INPUT_CLASS} text-right`}
              data-testid="balance-form-amount"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="balance-form-date" className={LABEL_CLASS}>
              Date
            </label>
            <DatePickerField id="balance-form-date" value={form.date} onChange={(date) => set({ date })} />
          </div>
        </div>
        <input
          autoComplete="off"
          type="text"
          maxLength={300}
          value={form.note}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Note (optional), e.g. from the copy, 15 Nov"
          className={INPUT_CLASS}
        />
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            className="w-full sm:w-auto"
            data-testid="balance-form-submit"
          >
            {isSaving ? "Saving…" : "Add to baqaya"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BalanceFormPopup;
