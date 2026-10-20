"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Scissors } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";

function Figure({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-primary-soft" : "bg-gray-100"}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-primary" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

/** Production snapshot for the dashboard: lots per state and today's cut pieces, linking to /lots. */
export function ProductionWidget() {
  const {
    data: summary,
    isLoading,
    error,
  } = useAsyncData(() => api.get("/api/lots/summary"), [], {
    cacheKey: "lots-summary",
  });

  const value = (n) => (isLoading ? "…" : (n ?? 0));

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-4 sm:p-6 rounded-xl shadow-sm"
      data-testid="production-widget"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
          <Scissors size={20} className="text-primary" /> Production
        </h2>
        <Link
          href="/lots"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary whitespace-nowrap"
        >
          All lots <ArrowRight size={16} />
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-gray-500">Production numbers are unavailable right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Figure label="New lots" value={value(summary?.newLots)} />
          <Figure label="In process" value={value(summary?.inProcess)} />
          <Figure label="Ready" value={value(summary?.ready)} highlight />
          <Figure label="Today's pieces" value={value(summary?.today?.pieces)} />
        </div>
      )}
    </motion.div>
  );
}

export default ProductionWidget;
