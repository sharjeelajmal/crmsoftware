"use client";

import { useState } from "react";
import { PauseCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLotHold } from "../hooks/useLotHold";

const TEXTAREA_CLASS =
  "w-full px-4 py-2.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary resize-none";

/** Stops an invoice where it is, with an optional reason; "Resume" lets it continue from the same stage. */
export function StopLotModal({ lot, onStopped, onCancel }) {
  const { stop, isWorking } = useLotHold();
  const [reason, setReason] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isWorking) return;
    const updated = await stop(lot, reason);
    if (updated) onStopped?.(updated);
  };

  return (
    <Modal onClose={isWorking ? undefined : onCancel} size="md">
      <form noValidate onSubmit={handleSubmit} data-testid="lot-stop-form">
        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <PauseCircle size={20} className="text-amber-600" />
          Stop {lot.lotNumber}?
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          Nothing moves on until it is resumed: no next step, gate pass, gate pass out, dispatch, work or cutting edit.
          Reverse and delete still work.
        </p>
        <label htmlFor="lot-stop-reason" className="block text-sm font-medium text-gray-700 mt-4 mb-1">
          Reason <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          autoComplete="off"
          id="lot-stop-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. waiting for buttons, party asked to hold"
          className={TEXTAREA_CLASS}
          data-testid="lot-stop-reason"
          autoFocus
        />
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onCancel} disabled={isWorking} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="submit"
            icon={PauseCircle}
            disabled={isWorking}
            className="w-full sm:w-auto"
            data-testid="lot-stop-confirm"
          >
            {isWorking ? "Stopping…" : "Stop invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default StopLotModal;
