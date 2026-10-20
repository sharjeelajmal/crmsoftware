"use client";

import { Check } from "lucide-react";
import { STAGES, stageLabel } from "../utils";
import { pipelineQtyFor } from "@/features/lots/utils";

const lineClass = (hidden, active) =>
  `flex-1 h-0.5 ${hidden ? "bg-transparent" : active ? "bg-primary" : "bg-gray-200"}`;

const circleClass = (state) =>
  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors " +
  (state === "done"
    ? "bg-primary text-white"
    : state === "current"
      ? "bg-white text-primary ring-2 ring-primary"
      : "bg-gray-100 text-gray-400");

const labelClass = (state) =>
  "text-[11px] sm:text-xs font-medium leading-tight truncate w-full " +
  (state === "current" ? "text-primary" : state === "done" ? "text-gray-700" : "text-gray-400");

/**
 * Read-only view of the 5 production steps with the current stage highlighted.
 * Pass the whole `lot` to show the pieces that reached each step; `stage` alone still works.
 */
export function LotPipeline({ lot, stage }) {
  const currentStage = stage ?? lot?.stage;
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <ol className="grid grid-cols-5 gap-1 sm:gap-2" aria-label="Production pipeline">
      {STAGES.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
        const qty = pipelineQtyFor(lot, step);
        return (
          <li key={step} className="flex flex-col items-center text-center gap-1.5 min-w-0" data-step-state={state}>
            <div className="flex items-center w-full">
              <span className={lineClass(index === 0, state !== "todo")} />
              <span className={circleClass(state)} aria-current={state === "current" ? "step" : undefined}>
                {state === "done" ? <Check size={16} /> : index + 1}
              </span>
              <span className={lineClass(index === STAGES.length - 1, state === "done")} />
            </div>
            <span className={labelClass(state)}>{stageLabel(step)}</span>
            {lot ? (
              <span
                className={`text-xs sm:text-sm font-bold ${qty === null ? "text-gray-300" : "text-gray-800"}`}
                data-testid={`lot-pipeline-qty-${step}`}
              >
                {qty === null ? "—" : `${qty} pcs`}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default LotPipeline;
