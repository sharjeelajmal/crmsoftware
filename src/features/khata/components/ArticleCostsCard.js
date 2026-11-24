"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Shirt } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";

function ArticleCost({ row }) {
  const [open, setOpen] = useState(false);
  return (
    <li
      className="rounded-xl border border-gray-100 bg-white"
      data-testid="article-cost"
      data-article={row.article}
      data-per-piece={row.perPiece}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
      >
        <span className="flex-grow min-w-0">
          <span className="block font-semibold text-gray-800 [overflow-wrap:anywhere]">{row.article}</span>
          <span className="block text-xs text-gray-500">
            {row.operations.length} {row.operations.length === 1 ? "operation" : "operations"}
          </span>
        </span>
        <span className="text-right whitespace-nowrap">
          <span className="block text-lg font-bold text-primary tabular-nums">{formatMoney(row.perPiece)}</span>
          <span className="block text-[11px] text-gray-500">per piece</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          className="border-t border-gray-100 px-3 py-2 text-sm divide-y divide-gray-50"
          data-testid="article-cost-ops"
        >
          {row.operations.map((op) => (
            <li key={op.operationId} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 text-gray-700 [overflow-wrap:anywhere]">
                {op.name}
                <span className="text-xs text-gray-400"> · {op.pieces} pcs</span>
              </span>
              <span className="font-semibold text-gray-800 tabular-nums whitespace-nowrap">{formatMoney(op.rate)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 pt-2 font-bold text-gray-800">
            <span>One piece</span>
            <span className="tabular-nums">{formatMoney(row.perPiece)}</span>
          </li>
        </ul>
      )}
    </li>
  );
}

/**
 * Per-piece stitching cost of each article (client, 2026-11-24): every operation's rate as paid in the khata, added
 * up — what one finished piece of Sada Denim, Goda, Baggy … comes to. Opens into its operations.
 */
export function ArticleCostsCard({ articles = [], isLoading = false }) {
  if (!isLoading && articles.length === 0) return null;
  return (
    <motion.section
      variants={itemVariants}
      className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg"
      data-testid="article-costs"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
        <Shirt size={18} className="text-primary" /> Stitching cost per piece
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Every operation&apos;s rate for the article, as entered in the khata, added up. Open one to see its operations.
      </p>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          {articles.map((row) => (
            <ArticleCost key={row.article} row={row} />
          ))}
        </ul>
      )}
    </motion.section>
  );
}

export default ArticleCostsCard;
