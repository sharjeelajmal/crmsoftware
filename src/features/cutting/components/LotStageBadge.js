"use client";

import { STAGE_BADGE_CLASS, stageLabel } from "../utils";

/** Small pill showing the pipeline stage of a lot. */
export function LotStageBadge({ stage, className = "" }) {
  return (
    <span
      className={
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap " +
        `${STAGE_BADGE_CLASS[stage] || STAGE_BADGE_CLASS.cutting} ${className}`
      }
      data-stage={stage}
    >
      {stageLabel(stage)}
    </span>
  );
}

export default LotStageBadge;
