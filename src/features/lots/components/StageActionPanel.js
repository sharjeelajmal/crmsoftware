"use client";

import { useEffect, useState } from "react";
import { ArrowRightCircle, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STAGE_ACTIONS, STAGE_LABELS, nextActionFor, maxQtyFor, lotShortfall } from "@/constants/lots";
import { useStageAction } from "../hooks/useStageAction";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";
const INPUT_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

function Title({ icon: Icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
      <Icon size={18} className="text-primary" />
      {children}
    </h2>
  );
}

function MutedCard({ icon, title, message, state }) {
  return (
    <div className={`${CARD_CLASS} bg-gray-50`} data-testid="lot-stage-panel" data-panel-state={state}>
      <Title icon={icon}>{title}</Title>
      <p className="text-sm text-gray-500 mt-2">{message}</p>
    </div>
  );
}

/**
 * Admin control to move a lot one step forward in the pipeline.
 * Shows the next action from STAGE_ACTIONS with a pieces input (when the step records a quantity),
 * an optional note and a live "shortfall at this step" hint. Calls `onUpdated(lot)` after a save.
 */
export function StageActionPanel({ lot, onUpdated }) {
  const actionKey = nextActionFor(lot);
  const action = actionKey ? STAGE_ACTIONS[actionKey] : null;
  const max = actionKey ? maxQtyFor(lot, actionKey) : null;
  const { runAction, isSubmitting } = useStageAction();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  // Each stage starts from the pieces recorded at the previous one.
  useEffect(() => {
    setQty(String(lotShortfall(lot).lastQty ?? ""));
    setNote("");
  }, [lot?._id, lot?.stage]); // eslint-disable-line react-hooks/exhaustive-deps -- lot object identity changes on refresh

  if (!action) {
    if (lot?.stage === "ready") {
      return (
        <MutedCard
          icon={CheckCircle2}
          title="Completed"
          message="This lot is ready for sale and its pieces have been added to stock."
          state="completed"
        />
      );
    }
    return (
      <MutedCard
        icon={Lock}
        title={`Current stage: ${STAGE_LABELS[lot?.stage] || lot?.stage || "—"}`}
        message="Ready for Sale (stock add) arrives in Phase 3."
        state="locked"
      />
    );
  }

  const pieces = Math.trunc(Number(qty));
  const qtyValid = !action.needsQty || (Number.isFinite(pieces) && pieces >= 0 && pieces <= max);
  const shortfall = action.needsQty && Number.isFinite(pieces) ? max - pieces : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const updated = await runAction(lot, actionKey, { qty, note });
    if (updated) onUpdated?.(updated);
  };

  return (
    <form onSubmit={handleSubmit} className={CARD_CLASS} data-testid="lot-stage-panel" data-action={actionKey}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Title icon={ArrowRightCircle}>Next step</Title>
        <p className="text-sm text-gray-500">
          Current stage: <span className="font-semibold text-gray-800">{STAGE_LABELS[lot.stage]}</span>
          <span className="mx-1.5">→</span>
          <span className="font-semibold text-primary">{STAGE_LABELS[action.to]}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {action.needsQty && (
          <div>
            <label htmlFor="lot-stage-qty" className="block text-sm font-medium text-gray-700 mb-1">
              Pieces received <span className="text-gray-400">(max {max})</span>
            </label>
            <input
              id="lot-stage-qty"
              type="number"
              inputMode="numeric"
              min={0}
              max={max}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={INPUT_CLASS}
              data-testid="lot-stage-qty"
              required
            />
            <p
              className={`text-xs mt-1.5 ${shortfall > 0 ? "text-danger font-semibold" : "text-gray-500"}`}
              data-testid="lot-stage-shortfall-hint"
            >
              {shortfall === null
                ? "Enter the pieces that came back from this step."
                : shortfall < 0
                  ? `Only ${max} pieces reached this stage.`
                  : `Shortfall at this step: ${shortfall} pcs`}
            </p>
          </div>
        )}
        <div className={action.needsQty ? "" : "md:col-span-2"}>
          <label htmlFor="lot-stage-note" className="block text-sm font-medium text-gray-700 mb-1">
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="lot-stage-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 3 pieces rejected at QC"
            className={INPUT_CLASS}
            data-testid="lot-stage-note"
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          type="submit"
          icon={ArrowRightCircle}
          disabled={isSubmitting || !qtyValid}
          className="w-full sm:w-auto"
          data-testid="lot-stage-action"
        >
          {isSubmitting ? "Saving…" : action.label}
        </Button>
      </div>
    </form>
  );
}

export default StageActionPanel;
