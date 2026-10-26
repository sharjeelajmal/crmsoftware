"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { dispatchProblem } from "@/constants/gatepass";
import { stitchBalanceOf, stitchOutQtyOf } from "@/constants/lots";
import { useDispatchLot } from "../hooks/useDispatchLot";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

/**
 * Sends part of a lot out of stitching to washing with its own gate pass. Pieces default to everything
 * still lying in stitching. `onDone({ lot, pass })` runs after the pass is issued (callers open it for print).
 */
export function DispatchModal({ lot, onDone, onCancel }) {
  const { dispatch, isDispatching } = useDispatchLot();
  const balance = stitchBalanceOf(lot);
  const [pieces, setPieces] = useState(String(balance));
  const [washType, setWashType] = useState(lot.washType || "");
  const [note, setNote] = useState("");
  const problem = dispatchProblem(lot, pieces);
  const left = Math.max(0, balance - (Math.trunc(Number(pieces)) || 0));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(lot, { pieces, washType, note });
    if (result) onDone?.(result);
  };

  return (
    <Modal onClose={isDispatching ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} className="space-y-5" data-testid="dispatch-form">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <Send size={22} className="text-primary" /> Gate pass out
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {lot.lotNumber} · {lot.productName} · stitching → washing
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Received", Number(lot.cutQty) || 0],
            ["Sent out", stitchOutQtyOf(lot)],
            ["Lying", balance],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`rounded-xl p-2 ${label === "Lying" ? "bg-primary-soft text-primary" : "bg-gray-100"}`}
            >
              <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
              <p className="text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dispatch-pieces" className={LABEL_CLASS}>
              Pieces going out <span className="text-gray-400">(max {balance})</span>
            </label>
            <input
              autoComplete="off"
              id="dispatch-pieces"
              type="number"
              inputMode="numeric"
              min={1}
              max={balance}
              step={1}
              value={pieces}
              onChange={(e) => setPieces(e.target.value)}
              className={INPUT_CLASS}
              data-testid="dispatch-pieces"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="dispatch-wash" className={LABEL_CLASS}>
              Wash type
            </label>
            <input
              autoComplete="off"
              id="dispatch-wash"
              type="text"
              maxLength={80}
              value={washType}
              onChange={(e) => setWashType(e.target.value)}
              placeholder="e.g. Enzyme wash"
              className={INPUT_CLASS}
              data-testid="dispatch-wash"
            />
          </div>
        </div>

        <div>
          <label htmlFor="dispatch-note" className={LABEL_CLASS}>
            Note <span className="text-gray-400">(optional)</span>
          </label>
          <input
            autoComplete="off"
            id="dispatch-note"
            type="text"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. first batch"
            className={INPUT_CLASS}
          />
        </div>

        <div className="space-y-3 p-3 rounded-xl bg-primary-soft">
          <p className={`text-sm ${problem ? "text-danger" : "text-gray-700"}`} data-testid="dispatch-hint">
            {problem || (
              <>
                After this: <span className="font-bold text-primary">{left} pcs</span> still in stitching
              </>
            )}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isDispatching} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button
              type="submit"
              icon={Send}
              disabled={isDispatching || Boolean(problem)}
              className="flex-1 sm:flex-none whitespace-nowrap"
              data-testid="dispatch-submit"
            >
              {isDispatching ? "Issuing…" : "Issue gate pass"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default DispatchModal;
