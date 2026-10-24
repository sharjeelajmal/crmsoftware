"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { shareParts, topWithOther } from "@/constants/dashboard";
import { formatMoney } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel } from "./Panel";

// Part-to-whole, categorical slots 1–3 in order (validated). Each part also shows its amount and share as text.
const PARTS = [
  { key: "purchasing", label: "Purchasing", swatch: "bg-chart-1", href: "/purchasing" },
  { key: "expenses", label: "Expenses", swatch: "bg-chart-2", href: "/expenses" },
  { key: "wages", label: "Wages earned", swatch: "bg-chart-3", href: "/wages" },
];

const percent = (share) => `${Math.round(share * 100)}%`;

/** Money going out this month: purchasing, expenses and wages earned, plus the biggest expense heads. */
export function SpendingCard({ money, className = "" }) {
  const { total, parts } = shareParts(
    PARTS.map((part) => ({
      ...part,
      value: { purchasing: money.purchasesMonth, expenses: money.expensesMonth, wages: money.wagesMonth }[part.key],
    }))
  );
  const visible = parts.filter((part) => part.share > 0);
  const heads = topWithOther(money.expensesByCategory, 4);
  const biggest = heads[0]?.amount || 0;

  return (
    <Panel
      icon={Wallet}
      title="Spending this month"
      subtitle="Purchasing, expenses and wages"
      className={className}
      testId="dash-spending"
    >
      <p className="text-3xl font-bold tracking-tight text-gray-800">
        <AnimatedNumber value={total} format={(n) => formatMoney(Math.round(n))} testId="dash-spending-total" />
      </p>
      <p className="text-xs text-gray-500">
        Purchasing today: <span className="font-semibold text-gray-700">{formatMoney(money.purchasesToday)}</span>
      </p>

      <div className="mt-4 flex h-2.5 gap-0.5" aria-hidden="true">
        {visible.length === 0 ? (
          <div className="flex-1 rounded-full bg-surface-muted" />
        ) : (
          visible.map((part, index) => (
            <motion.div
              key={part.key}
              className={`h-full ${part.swatch} ${index === 0 ? "rounded-l-full" : ""} ${index === visible.length - 1 ? "rounded-r-full" : ""}`}
              initial={{ width: 0 }}
              animate={{ width: `${part.share * 100}%` }}
              transition={{ duration: 0.9, delay: 0.1 * index, ease: [0.16, 1, 0.3, 1] }}
            />
          ))
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {parts.map((part) => (
          <li key={part.key}>
            <Link
              href={part.href}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 text-sm hover:bg-surface-muted transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${part.swatch}`} aria-hidden="true" />
              <span className="text-gray-600 flex-1 truncate">{part.label}</span>
              <span className="font-semibold text-gray-800 tabular-nums">{formatMoney(part.value)}</span>
              <span className="w-10 text-right text-xs text-gray-500 tabular-nums">{percent(part.share)}</span>
            </Link>
          </li>
        ))}
      </ul>

      {heads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Top expense heads</p>
          <ul className="space-y-2">
            {heads.map((head, index) => (
              <li key={head.category} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-gray-700 truncate">{head.category}</span>
                  <span className="shrink-0 text-xs font-semibold text-gray-800 tabular-nums">
                    {formatMoney(head.amount)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-chart-2"
                    initial={{ width: 0 }}
                    animate={{ width: `${biggest > 0 ? (head.amount / biggest) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export default SpendingCard;
