"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { lockCutProblem, lockPreview, lockProblem, lockSettlement } from "@/constants/wages";
import { formatMoney } from "@/lib/format";

const INPUT_CLASS = "w-full p-2.5 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

function Line({ label, value, strong = false, testId }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "font-bold text-gray-800" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums whitespace-nowrap" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}

/**
 * "Lock" / "Pay all": up to this day the worker is paid. Shows what it pays before it is saved — the unpaid work done
 * on or before the day, an advance cut there (when he has advance), the baqaya brought in from before — and takes the
 * cash actually handed over (client, 2026-11-22: no change in hand, or a little extra): less or more than due stays
 * as his baqaya. The khata starts again after it.
 */
export function LockModal({
  workerName,
  entries = [],
  advanceLeft = 0,
  baqaya = 0,
  initialUpTo = "",
  title = "",
  onLock,
  onCancel,
  isSaving = false,
}) {
  const [upTo, setUpTo] = useState(() => initialUpTo || format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [cut, setCut] = useState("");
  const [cash, setCash] = useState(""); // empty: all that is due
  const preview = lockPreview(entries, new Date(`${upTo}T12:00:00`));
  const advanceCut = Number(cut) || 0;
  const settlement = lockSettlement({ work: preview.amount, advanceCut, baqaya, cash });
  const problem = lockProblem(preview) || lockCutProblem(advanceCut, { work: preview.amount, advanceLeft });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (problem || isSaving) return;
    if (await onLock(upTo, note.trim(), advanceCut, settlement.cash)) onCancel();
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="khata-lock-form">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <Lock size={20} className="text-primary" /> {title || `Lock ${workerName}'s khata`}
        </h3>
        <p className="text-sm text-gray-600">
          Everything not paid yet, done on or before this day, is marked paid. New work starts after it.
        </p>
        <div>
          <label htmlFor="khata-lock-date" className={LABEL_CLASS}>
            Paid up to
          </label>
          <DatePickerField id="khata-lock-date" value={upTo} onChange={setUpTo} testId="khata-lock-date" />
        </div>
        {advanceLeft > 0 && (
          <div>
            <label htmlFor="khata-lock-cut" className={LABEL_CLASS}>
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

        <div
          className="rounded-xl bg-primary-soft p-3 text-sm text-gray-700 space-y-1"
          data-testid="khata-lock-preview"
          data-amount={preview.amount}
          data-due={settlement.due}
          data-count={preview.entries.length}
        >
          {problem ? (
            <span className="text-danger">{problem}</span>
          ) : (
            <>
              <Line
                label={`Work · ${preview.entries.length} ${preview.entries.length === 1 ? "line" : "lines"}`}
                value={formatMoney(preview.amount)}
              />
              {advanceCut > 0 && <Line label="Advance cut" value={`− ${formatMoney(advanceCut)}`} />}
              {baqaya !== 0 && (
                <Line
                  label={baqaya > 0 ? "Baqaya from before (you still give him)" : "Given extra before (he gives back)"}
                  value={`${baqaya > 0 ? "+" : "−"} ${formatMoney(Math.abs(baqaya))}`}
                  testId="khata-lock-baqaya"
                />
              )}
              <Line
                label={settlement.due < 0 ? "He owes you now" : "Due now"}
                value={`${settlement.due < 0 ? "− " : ""}${formatMoney(Math.abs(settlement.due))}`}
                strong
                testId="khata-lock-due"
              />
            </>
          )}
        </div>

        {!problem && (
          <div>
            <label htmlFor="khata-lock-cash" className={LABEL_CLASS}>
              Cash given <span className="text-gray-400">(less stays as baqaya, more goes to his advance)</span>
            </label>
            <input
              autoComplete="off"
              id="khata-lock-cash"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder={String(Math.max(0, settlement.due))}
              className={`${INPUT_CLASS} text-right`}
              data-testid="khata-lock-cash"
            />
            <p
              className={`mt-1 text-sm font-medium ${
                settlement.after === 0 && settlement.extra === 0 ? "text-success" : "text-amber-700"
              }`}
              data-testid="khata-lock-after"
              data-after={settlement.after}
              data-extra={settlement.extra}
            >
              {settlement.extra > 0
                ? `${formatMoney(settlement.extra)} more than due — it goes to his advance (he gives it back).`
                : settlement.after > 0
                  ? `Baqaya after: you still give him ${formatMoney(settlement.after)}.`
                  : "All settled — no baqaya left."}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="khata-lock-note" className={LABEL_CLASS}>
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
            {isSaving ? "Locking…" : `Pay ${formatMoney(settlement.cash)} & lock`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default LockModal;
