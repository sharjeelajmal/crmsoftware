"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { PauseCircle, PlayCircle, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STAGE_LABELS, deleteProblem, previousStage } from "@/constants/lots";
import { useLotHold } from "../hooks/useLotHold";
import { ReverseLotModal } from "./ReverseLotModal";
import { StopLotModal } from "./StopLotModal";
import { DeleteLotModal } from "./DeleteLotModal";

/**
 * Admin controls in the invoice header, at any stage (client, 2026-11-09): Reverse one stage, Stop / Resume, Delete.
 * At ready, "Reverse (take stock back)" sits on the Completed card instead. `onChanged(lot)` after a reverse, stop or
 * resume; `onDeleted()` after a delete.
 */
export function LotActions({ lot, onChanged, onDeleted }) {
  const [popup, setPopup] = useState(null); // "reverse" | "stop" | "delete"
  const { resume, isWorking } = useLotHold();
  const back = previousStage(lot.stage);
  const canReverse = Boolean(back) && lot.stage !== "ready";
  const deleteBlocked = deleteProblem(lot);
  const close = () => setPopup(null);
  const done = (updated) => {
    close();
    onChanged?.(updated);
  };

  const handleResume = async () => {
    const updated = await resume(lot);
    if (updated) onChanged?.(updated);
  };

  return (
    <>
      <AnimatePresence>
        {popup === "reverse" && <ReverseLotModal lot={lot} onReversed={done} onCancel={close} />}
        {popup === "stop" && <StopLotModal lot={lot} onStopped={done} onCancel={close} />}
        {popup === "delete" && <DeleteLotModal lot={lot} onDeleted={onDeleted} onCancel={close} />}
      </AnimatePresence>
      {canReverse && (
        <Button
          variant="secondary"
          icon={Undo2}
          onClick={() => setPopup("reverse")}
          className="w-full sm:w-auto whitespace-nowrap"
          data-testid="lot-reverse-step"
        >
          Reverse to {STAGE_LABELS[back]}
        </Button>
      )}
      {lot.hold ? (
        <Button
          icon={PlayCircle}
          onClick={handleResume}
          disabled={isWorking}
          className="w-full sm:w-auto whitespace-nowrap"
          data-testid="lot-resume"
        >
          {isWorking ? "Resuming…" : "Resume"}
        </Button>
      ) : (
        <Button
          variant="secondary"
          icon={PauseCircle}
          onClick={() => setPopup("stop")}
          className="w-full sm:w-auto whitespace-nowrap"
          data-testid="lot-stop"
        >
          Stop
        </Button>
      )}
      <Button
        variant="danger"
        icon={Trash2}
        onClick={() => setPopup("delete")}
        disabled={Boolean(deleteBlocked)}
        data-tip={deleteBlocked || undefined}
        className="w-full sm:w-auto whitespace-nowrap"
        data-testid="lot-delete"
      >
        Delete invoice
      </Button>
    </>
  );
}

export default LotActions;
