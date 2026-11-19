"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { lockCash, lockCutProblem, lockPreview, lockProblem } from "@/constants/wages";
import { formatMoney } from "@/lib/format";

const INPUT_CLASS = "w-full p-2.5 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/**
 * "Lock": up to this day the worker is paid. Shows what it pays before it is saved — the unpaid work done on or
 * before the day and its wages; the khata starts again after it. With advance outstanding, part of it can be cut
 * here: he gets the work less the cut in hand.
 */
export function LockModal({ workerName, entries = [], advanceLeft = 0, onLock, onCancel, isSaving = false }) {
  const [upTo, setUpTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [cut, setCut] = useState("");
  const preview = lockPreview(entries, new Date(`${upTo}T12:00:00`));
  const advanceCut = Number(cut) || 0;
  const problem = lockProblem(preview) || lockCutProblem(advanceCut, { work: preview.amount, advanceLeft });
  const cash = lockCash(preview.amount, advanceCut);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (problem || isSaving) return;
    if (await onLock(upTo, note.trim(), advanceCut)) onCancel();
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="khata-lock-form">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Lock size={20} className="text-primary" /> Lock {workerName}&apos;s khata
        </h3>
        <p className="text-sm text-gray-600">
          Everything not paid yet, done on or before this day, is marked paid. New work starts after it.
        </p>
        <div>
          <label htmlFor="khata-lock-date" className="block text-sm font-medium text-gray-700 mb-1">
            Paid up to
          </label>
          <DatePickerField id="khata-lock-date" value={upTo} onChange={setUpTo} testId="khata-lock-date" />
        </div>
        {advanceLeft > 0 && (
          <div>
            <label htmlFor="khata-lock-cut" className="block text-sm font-medium text-gray-700 mb-1">
              Advance cut <span className="text-gray-400">(optional · {formatMoney(advanceLeft)} advance left)</span>
            </label>
            <input
              autoComplete="off"
              id="khata-lock-cut"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={cut}
              onChange={(e) => setCut(e.target.value)}
              placeholder="0"
              className={`${INPUT_CLASS} text-right`}
              data-testid="khata-lock-cut"
            />
          </div>
        )}
        <div>
          <label htmlFor="khata-lock-note" className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="khata-lock-note"
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. paid in cash"
            className={INPUT_CLASS}
          />
        </div>
        <div
          className="rounded-xl bg-primary-soft p-3 text-sm text-gray-700"
          data-testid="khata-lock-preview"
          data-amount={preview.amount}
          data-cash={cash}
          data-count={preview.entries.length}
        >
          {problem ? (
            <span className="text-danger">{problem}</span>
          ) : (
            <>
              <span className="font-semibold">{preview.entries.length}</span>{" "}
              {preview.entries.length === 1 ? "entry" : "entries"} ·{" "}
              {advanceCut > 0 ? (
                <>
                  work {formatMoney(preview.amount)} − advance cut {formatMoney(advanceCut)} ={" "}
                  <span className="text-lg font-bold text-primary">{formatMoney(cash)}</span> in hand
                </>
              ) : (
                <>
                  <span className="text-lg font-bold text-primary">{formatMoney(preview.amount)}</span> to pay now
                </>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSaving} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            icon={Lock}
            disabled={Boolean(problem) || isSaving}
            className="w-full sm:w-auto"
            data-testid="khata-lock-confirm"
          >
            {isSaving ? "Locking…" : `Pay ${formatMoney(cash)} & lock`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default LockModal;
