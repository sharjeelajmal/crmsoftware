"use client";

import { motion } from "framer-motion";
import { Boxes, CircleCheck, TriangleAlert } from "lucide-react";
import { compactNumber } from "@/constants/dashboard";
import { formatMoney } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel, PanelEmpty } from "./Panel";

function Figure({ label, children }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-muted px-3 py-2.5">
      <p className="text-[11px] text-gray-500 truncate">{label}</p>
      <p className="text-base font-bold text-gray-800 truncate">{children}</p>
    </div>
  );
}

/** A count with its warning colour and icon; a zero count stays neutral with a tick. */
function StatusChip({ count, tone, testId, children }) {
  const Icon = count > 0 ? TriangleAlert : CircleCheck;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${count > 0 ? tone : "bg-surface-muted text-gray-600"}`}
      data-testid={testId}
    >
      <Icon size={13} aria-hidden="true" /> {children}
    </span>
  );
}

/** Stock at a glance: totals, how many products are out or low, and the ones to restock first. */
export function StockHealth({ stock, className = "" }) {
  const healthy = stock.out === 0 && stock.low === 0;

  return (
    <Panel
      icon={Boxes}
      title="Stock health"
      subtitle={`${stock.products} products`}
      href="/inventory"
      linkLabel="Inventory"
      className={className}
      testId="dash-stock"
    >
      <div className="grid grid-cols-2 gap-2">
        <Figure label="Pieces in stock">
          <AnimatedNumber value={stock.pieces} format={compactNumber} />
        </Figure>
        <Figure label="Stock value (cost)">
          <AnimatedNumber value={stock.value} format={(n) => formatMoney(Math.round(n))} />
        </Figure>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <StatusChip count={stock.out} tone="bg-danger-soft text-danger" testId="dash-stock-out">
          {stock.out} out of stock
        </StatusChip>
        <StatusChip count={stock.low} tone="bg-warning-soft text-amber-700" testId="dash-stock-low">
          {stock.low} low (under {stock.threshold})
        </StatusChip>
      </div>

      <div className="mt-4">
        {healthy || stock.restock.length === 0 ? (
          <PanelEmpty icon={CircleCheck} title="Stock looks healthy" hint="No product is out or running low." />
        ) : (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Restock first</p>
            <ul className="space-y-2.5">
              {stock.restock.map((product, index) => {
                const out = product.remaining <= 0;
                const share = Math.min(1, product.remaining / stock.threshold);
                return (
                  <li key={product._id} className="min-w-0" data-testid="dash-restock-row">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-800 truncate">{product.name}</span>
                      <span className={`shrink-0 text-xs font-semibold ${out ? "text-danger" : "text-gray-600"}`}>
                        {out ? "Out" : `${product.remaining} left`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${out ? "bg-danger" : "bg-warning"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(out ? 0 : 4, share * 100)}%` }}
                        transition={{ duration: 0.8, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Panel>
  );
}

export default StockHealth;
