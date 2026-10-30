"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Truck } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { dispatchBalance } from "@/constants/dispatch";
import { Button } from "@/components/ui/Button";
import { GatePassModal } from "@/features/cutting/components/GatePassModal";
import { useLotWork } from "@/features/wages/hooks/useLotWork";
import { useDispatchOut } from "../hooks/useDispatchOut";
import { DispatchOutModal } from "./DispatchOutModal";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted px-3 py-2.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${tone}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

/**
 * Admin card on a Ready lot: how many pieces are ready, already dispatched and still in the factory (per size), and
 * "Dispatch" — pieces go out to a party / shop with a dispatch gate pass, all at once or in parts.
 */
export function DispatchOutPanel({ lot, onUpdated }) {
  const balance = dispatchBalance(lot);
  const { totals } = useLotWork(lot);
  const { parties, dispatch, isSaving } = useDispatchOut(lot);
  const [open, setOpen] = useState(false);
  const [printed, setPrinted] = useState(null);

  const handleSave = async (form) => {
    const pass = await dispatch(form);
    if (!pass) return;
    setOpen(false);
    setPrinted(pass);
    onUpdated?.();
  };

  return (
    <motion.div
      variants={itemVariants}
      className={CARD_CLASS}
      data-testid="dispatch-panel"
      data-left={balance.left}
      data-sent={balance.sent}
    >
      <AnimatePresence>
        {open && (
          <DispatchOutModal
            lot={lot}
            parties={parties}
            labour={totals.amount}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={() => setOpen(false)}
          />
        )}
        {printed && <GatePassModal pass={printed} onClose={() => setPrinted(null)} />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Truck size={18} className="text-primary" /> Dispatch
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ready pieces leave the factory with a dispatch gate pass — all at once or a few at a time.
          </p>
        </div>
        <Button
          icon={Truck}
          onClick={() => setOpen(true)}
          disabled={balance.left === 0}
          className="w-full sm:w-auto whitespace-nowrap"
          data-testid="dispatch-open"
        >
          Dispatch pieces
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Figure label="Ready" value={balance.ready} testId="dispatch-ready" />
        <Figure label="Dispatched" value={balance.sent} tone="text-success" testId="dispatch-sent" />
        <Figure label="In factory" value={balance.left} tone="text-primary" testId="dispatch-left" />
      </div>

      {balance.rows.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {balance.rows.map((row) => (
            <span
              key={row.size}
              className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700"
              data-testid="dispatch-size-left"
              data-size={row.size}
            >
              <b>{row.size}</b> · {row.left} left{row.sent ? ` (${row.sent} sent)` : ""}
            </span>
          ))}
        </div>
      )}
      {balance.left === 0 && balance.sent > 0 && (
        <p className="mt-3 text-sm font-semibold text-success" data-testid="dispatch-done">
          Every ready piece of this invoice has been dispatched.
        </p>
      )}
    </motion.div>
  );
}

export default DispatchOutPanel;
