"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { stitchBalanceOf, stitchOutQtyOf } from "@/constants/lots";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";

/** One lot in the stitching unit: received, sent out, lying (with a bar) and the "Gate pass out" action. */
export function StitchingRow({ lot, onDispatch }) {
  const received = Number(lot.cutQty) || 0;
  const out = stitchOutQtyOf(lot);
  const lying = stitchBalanceOf(lot);
  const percent = received > 0 ? Math.round((out / received) * 100) : 0;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-xl bg-white shadow-sm"
      data-testid="stitching-row"
      data-lot-number={lot.lotNumber}
      data-lying={lying}
    >
      <div className="md:flex-1 min-w-0">
        <Link href={`/lots/${lot._id}`} className="font-bold text-primary hover:underline">
          {lot.lotNumber}
        </Link>
        <p className="text-sm text-gray-700 truncate">{lot.productName}</p>
        <p className="text-xs text-gray-500">
          {lot.bundleNumber ? `Cut ${lot.bundleNumber} · ` : ""}since {formatDate(lot.updatedAt || lot.createdAt)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 md:w-80 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Received</p>
          <p className="font-semibold text-gray-800">{received}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Sent out</p>
          <p className="font-semibold text-gray-800">{out}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Lying</p>
          <p className="font-bold text-primary">{lying}</p>
        </div>
        <div className="col-span-3 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon={Send}
        onClick={() => onDispatch(lot)}
        disabled={lying <= 0}
        className="w-full md:w-auto whitespace-nowrap"
        data-testid="stitching-row-dispatch"
      >
        Gate pass out
      </Button>
    </motion.div>
  );
}

export default StitchingRow;
