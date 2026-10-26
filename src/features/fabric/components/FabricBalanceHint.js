"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Scroll } from "lucide-react";
import { balanceAfterCut, cleanFabricName, formatFabricQty } from "@/constants/fabric";

/**
 * Under the cutting form's fabric fields: what the khata has of this fabric and what will be left after this cutting
 * (`lot` in edit mode gives back what the entry used before). Never blocks saving — it only warns.
 */
export function FabricBalanceHint({ balances, name, unit, qty, lot = null }) {
  const typed = cleanFabricName(name);
  const info = typed ? balanceAfterCut(balances, { name, unit, qty }, lot) : null;
  const short = info && info.after < 0;

  return (
    // "wait": the "not in your khata" note leaves before the balance box comes in (never both at once).
    <AnimatePresence initial={false} mode="wait">
      {typed && (
        <motion.div
          key={info ? "known" : "new"}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          {info ? (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm ${
                short ? "border-danger-border bg-danger-soft" : "border-primary/20 bg-primary-soft"
              }`}
              data-testid="lot-form-fabric-balance"
              data-before={info.before}
              data-after={info.after}
            >
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700 tabular-nums">
                <span>
                  Received <b className="text-gray-800">{formatFabricQty(info.received, info.unit)}</b>
                </span>
                <span>
                  Used <b className="text-gray-800">{formatFabricQty(info.usedBefore, info.unit)}</b>
                </span>
                <span>
                  In hand <b className="text-gray-800">{formatFabricQty(info.before, info.unit)}</b>
                </span>
              </div>
              <p className="mt-1 font-semibold text-gray-800">
                After this cutting:{" "}
                <span className={short ? "text-danger" : "text-primary"}>{formatFabricQty(info.after, info.unit)}</span>
              </p>
              {short && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
                  <AlertTriangle size={14} /> More than what is in hand — check the quantity or record the fabric
                  received.
                </p>
              )}
            </div>
          ) : (
            <p
              className="flex items-start gap-2 rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-gray-600"
              data-testid="lot-form-fabric-balance"
              data-state="new"
            >
              <Scroll size={14} className="shrink-0 mt-0.5 text-gray-500" />
              <span>
                “{typed}” ({unit}) is not in your fabric khata yet.{" "}
                <Link href="/fabric" className="font-semibold text-primary hover:underline">
                  Record it on Fabric Khata
                </Link>{" "}
                so its balance is kept.
              </span>
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FabricBalanceHint;
