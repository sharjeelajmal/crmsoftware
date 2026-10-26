"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { formatFabricQty } from "@/constants/fabric";

/**
 * One card per fabric: what is in hand (big), received / used, and a bar of how much of it was cut. A negative
 * balance means more was cut than was recorded as received. Clicking a card shows that fabric's day-by-day khata.
 */
export function FabricInHand({ balances, selected = "", onSelect }) {
  if (balances.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-gray-500" data-testid="fabric-empty">
        No fabric yet. Press “Receive Fabric” when fabric comes from the store.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3 gap-3">
      {balances.map((row, index) => {
        const usedShare = row.received > 0 ? Math.min(100, (row.used / row.received) * 100) : row.used > 0 ? 100 : 0;
        const short = row.balance < 0;
        const isSelected = selected === row.key;
        return (
          <motion.li
            key={row.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * index, duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => onSelect(isSelected ? "" : row.key)}
              aria-pressed={isSelected}
              className={`w-full text-left rounded-2xl border bg-white p-4 transition cursor-pointer hover:shadow-md ${
                isSelected ? "border-primary ring-2 ring-primary/30" : "border-gray-100"
              }`}
              data-testid="fabric-balance-card"
              data-key={row.key}
              data-balance={row.balance}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-bold text-gray-800 [overflow-wrap:anywhere]">{row.name}</p>
                {isSelected && (
                  <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-primary text-white">
                    <Check size={14} />
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">In hand</p>
              <p
                className={`text-2xl font-bold tabular-nums ${short ? "text-danger" : "text-primary"}`}
                data-testid="fabric-balance-value"
              >
                {formatFabricQty(row.balance, row.unit)}
              </p>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <motion.div
                  className={`h-full rounded-full ${short ? "bg-danger" : "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${usedShare}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-gray-600 tabular-nums">
                <span>
                  Received <b className="text-gray-800">{formatFabricQty(row.received, row.unit)}</b>
                </span>
                <span>
                  Used <b className="text-gray-800">{formatFabricQty(row.used, row.unit)}</b>
                </span>
              </div>
              {short && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
                  <AlertTriangle size={14} /> More was cut than received — record the missing fabric.
                </p>
              )}
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default FabricInHand;
