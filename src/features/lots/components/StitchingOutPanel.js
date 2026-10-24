"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { stitchBalanceOf, stitchOutQtyOf } from "@/constants/lots";
import { GatePassModal } from "@/features/cutting/components/GatePassModal";
import { DispatchModal } from "./DispatchModal";

/**
 * Stitching balance on the lot page: received / sent out / lying with a progress bar, and the
 * "Gate pass out" action for sending part of the lot to washing. `onUpdated(lot)` after each pass.
 */
export function StitchingOutPanel({ lot, onUpdated }) {
  const [dispatching, setDispatching] = useState(false);
  const [pass, setPass] = useState(null);
  const received = Number(lot.cutQty) || 0;
  const out = stitchOutQtyOf(lot);
  const lying = stitchBalanceOf(lot);
  const percent = received > 0 ? Math.round((out / received) * 100) : 0;

  const handleDone = ({ lot: updated, pass: issued }) => {
    setDispatching(false);
    setPass(issued);
    onUpdated?.(updated);
  };

  return (
    <div
      className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 sm:p-4"
      data-testid="stitching-balance"
      data-lying={lying}
    >
      <AnimatePresence>
        {dispatching && <DispatchModal lot={lot} onDone={handleDone} onCancel={() => setDispatching(false)} />}
        {pass && <GatePassModal pass={pass} onClose={() => setPass(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="grid grid-cols-3 gap-3 text-sm flex-grow">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Received</p>
            <p className="font-bold text-gray-800">{received} pcs</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Sent out</p>
            <p className="font-bold text-gray-800" data-testid="stitching-out">
              {out} pcs
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">Lying</p>
            <p className="font-bold text-primary" data-testid="stitching-lying">
              {lying} pcs
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          icon={Send}
          onClick={() => setDispatching(true)}
          disabled={lying <= 0}
          className="w-full sm:w-auto whitespace-nowrap"
          data-testid="stitching-dispatch"
        >
          Gate pass out
        </Button>
      </div>
      <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Send pieces to washing in parts as they finish; each part gets its own gate pass. When stitching is done, close
        it below with the total pieces — any pieces not yet sent get the final gate pass.
      </p>
    </div>
  );
}

export default StitchingOutPanel;
