"use client";

import { useEffect, useState } from "react";
import { ArrowRightCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  STAGE_ACTIONS,
  STAGE_LABELS,
  nextActionFor,
  maxQtyFor,
  minQtyFor,
  lotShortfall,
  stitchOutQtyOf,
} from "@/constants/lots";
import { useStageAction } from "../hooks/useStageAction";
import { ReadyForSaleForm } from "./ReadyForSaleForm";
import { ReadyDoneCard } from "./ReadyDoneCard";
import { StitchingOutPanel } from "./StitchingOutPanel";

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

/** Plain stage step (cutting → stitching → washing → packing): pieces + optional note. */
function StageStepForm({ lot, actionKey, onUpdated }) {
  const action = STAGE_ACTIONS[actionKey];
  const max = maxQtyFor(lot, actionKey);
  const min = minQtyFor(lot, actionKey);
  const sentOut = actionKey === "stitched" ? stitchOutQtyOf(lot) : 0;
  const { runAction, isSubmitting } = useStageAction();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [washType, setWashType] = useState("");
  const asksWash = actionKey === "stitched"; // the pieces go to washing next: printed on the washing gate pass

  // Each stage starts from the pieces recorded at the previous one.
  useEffect(() => {
    setQty(String(lotShortfall(lot).lastQty ?? ""));
    setNote("");
    setWashType("");
  }, [lot?._id, lot?.stage]); // eslint-disable-line react-hooks/exhaustive-deps -- lot object identity changes on refresh

  const pieces = Math.trunc(Number(qty));
  const qtyValid = !action.needsQty || (Number.isFinite(pieces) && pieces >= min && pieces <= max);
  const shortfall = action.needsQty && Number.isFinite(pieces) ? max - pieces : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const updated = await runAction(lot, actionKey, { qty, note, washType });
    if (updated) onUpdated?.(updated);
  };

  return (
    // The partial-pass panel has its own form (in a modal), so it sits outside this step's <form noValidate>.
    <div className={CARD_CLASS} data-testid="lot-stage-panel" data-action={actionKey}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <Title icon={ArrowRightCircle}>Next step</Title>
        <p className="text-sm text-gray-500">
          Current stage: <span className="font-semibold text-gray-800">{STAGE_LABELS[lot.stage]}</span>
          <span className="mx-1.5">→</span>
          <span className="font-semibold text-primary">{STAGE_LABELS[action.to]}</span>
        </p>
      </div>

      {actionKey === "stitched" && (
        <div className="mt-4">
          <StitchingOutPanel lot={lot} onUpdated={onUpdated} />
        </div>
      )}

      <form noValidate onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {action.needsQty && (
            <div>
              <label htmlFor="lot-stage-qty" className="block text-sm font-medium text-gray-700 mb-1">
                Pieces received <span className="text-gray-400">(max {max})</span>
              </label>
              <input
                autoComplete="off"
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
                    : pieces < min
                      ? `${min} pieces already went out with gate passes — enter at least ${min}.`
                      : `Shortfall at this step: ${shortfall} pcs`}
                {sentOut > 0 && pieces >= min && pieces <= max ? ` · final gate pass: ${pieces - sentOut} pcs` : ""}
              </p>
            </div>
          )}
          {asksWash && (
            <div>
              <label htmlFor="lot-stage-wash" className="block text-sm font-medium text-gray-700 mb-1">
                Wash type <span className="text-gray-400">(for the washing gate pass)</span>
              </label>
              <input
                autoComplete="off"
                id="lot-stage-wash"
                type="text"
                maxLength={80}
                value={washType}
                onChange={(e) => setWashType(e.target.value)}
                placeholder="e.g. Enzyme wash, Random wash"
                className={INPUT_CLASS}
                data-testid="lot-stage-wash"
              />
            </div>
          )}
          <div className={action.needsQty && !asksWash ? "" : "md:col-span-2"}>
            <label htmlFor="lot-stage-note" className="block text-sm font-medium text-gray-700 mb-1">
              Note <span className="text-gray-400">(optional)</span>
            </label>
            <input
              autoComplete="off"
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
    </div>
  );
}

/**
 * Admin control to move a lot one step forward in the pipeline.
 * - cutting/stitching/washing: the plain step form (pieces + note, live shortfall hint).
 * - packing: `ReadyForSaleForm` (per-size split, adds the pieces to stock after confirmation).
 * - ready: `ReadyDoneCard` (what was added, by whom; `canReverse` shows the admin undo).
 * Calls `onUpdated(lot)` after every save.
 */
export function StageActionPanel({ lot, canReverse = true, onUpdated }) {
  const actionKey = nextActionFor(lot);
  const action = actionKey ? STAGE_ACTIONS[actionKey] : null;

  if (lot?.stage === "ready") return <ReadyDoneCard lot={lot} canReverse={canReverse} onUpdated={onUpdated} />;
  if (action?.addsStock) return <ReadyForSaleForm lot={lot} onUpdated={onUpdated} />;
  if (!action) {
    return (
      <div className={`${CARD_CLASS} bg-gray-50`} data-testid="lot-stage-panel" data-panel-state="locked">
        <Title icon={Lock}>Current stage: {STAGE_LABELS[lot?.stage] || lot?.stage || "—"}</Title>
        <p className="text-sm text-gray-500 mt-2">No action is available for this invoice right now.</p>
      </div>
    );
  }
  return <StageStepForm lot={lot} actionKey={actionKey} onUpdated={onUpdated} />;
}

export default StageActionPanel;
