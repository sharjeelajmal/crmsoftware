"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Scroll } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatFabricQty } from "@/constants/fabric";
import { useFabricBalances } from "../hooks/useFabricBalances";

const SHOWN = 4;

/** "Fabric in hand" panel on My Lots: the fabrics with the most in hand first, linking to the full khata. */
export function FabricInHandStrip() {
  const { balances, isLoading } = useFabricBalances();
  if (isLoading) return null;
  const shown = [...balances].sort((a, b) => b.balance - a.balance).slice(0, SHOWN);

  return (
    <motion.div
      variants={itemVariants}
      className="@container rounded-2xl bg-white p-4 sm:p-5 shadow-sm"
      data-testid="fabric-strip"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 font-bold text-gray-800">
          <Scroll size={18} className="text-primary" /> Fabric in hand
        </h2>
        <Link
          href="/fabric"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          data-testid="fabric-strip-link"
        >
          Fabric Khata <ArrowRight size={14} />
        </Link>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          Record the fabric you get from the store on Fabric Khata — what is left after each cutting shows here.
        </p>
      ) : (
        <ul className="grid grid-cols-1 @md:grid-cols-2 @4xl:grid-cols-4 gap-2">
          {shown.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2.5"
              data-testid="fabric-strip-row"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-800 truncate">{row.name}</span>
                <span className="block text-xs text-gray-500 truncate">
                  of {formatFabricQty(row.received, row.unit)} received
                </span>
              </span>
              <span
                className={`shrink-0 text-lg font-bold tabular-nums ${row.balance < 0 ? "text-danger" : "text-primary"}`}
              >
                {formatFabricQty(row.balance, row.unit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

export default FabricInHandStrip;
