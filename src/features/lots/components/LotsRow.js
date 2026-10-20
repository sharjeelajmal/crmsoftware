"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatDate } from "@/lib/format";
import { formatPieces } from "@/features/cutting/utils";
import { LotStageBadge } from "@/features/cutting/components/LotStageBadge";

/** Column widths shared with the table header. */
export const LOTS_COLUMNS = {
  lot: "md:w-28",
  product: "md:flex-1",
  qty: "md:w-24",
  stage: "md:w-32",
  by: "md:w-36",
  date: "md:w-28",
};

function Stat({ label, children }) {
  return (
    <div className="md:hidden">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <div className="font-semibold text-gray-700">{children}</div>
    </div>
  );
}

/** One lot: a table row on md+, a card on phones. The whole row links to the lot detail. */
export function LotsRow({ lot }) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={`/lots/${lot._id}`}
        data-testid="lots-row"
        data-lot-number={lot.lotNumber}
        className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-xl bg-white shadow-sm
          hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between md:contents">
          <span className={`font-bold text-gray-800 ${LOTS_COLUMNS.lot}`}>{lot.lotNumber}</span>
          <span className="md:hidden">
            <LotStageBadge stage={lot.stage} />
          </span>
        </div>
        <span className={`text-gray-700 truncate ${LOTS_COLUMNS.product}`}>{lot.productName}</span>
        <span className={`hidden md:inline text-gray-700 ${LOTS_COLUMNS.qty}`}>{formatPieces(lot.cutQty)}</span>
        <span className={`hidden md:inline ${LOTS_COLUMNS.stage}`}>
          <LotStageBadge stage={lot.stage} />
        </span>
        <span className={`hidden md:inline text-gray-600 truncate ${LOTS_COLUMNS.by}`}>
          {lot.createdBy?.name || "—"}
        </span>
        <span className={`hidden md:inline text-gray-600 ${LOTS_COLUMNS.date}`}>{formatDate(lot.createdAt)}</span>
        <div className="grid grid-cols-3 gap-2 md:hidden border-t border-gray-100 pt-3">
          <Stat label="Cut qty">{formatPieces(lot.cutQty)}</Stat>
          <Stat label="Created by">{lot.createdBy?.name || "—"}</Stat>
          <Stat label="Date">{formatDate(lot.createdAt)}</Stat>
        </div>
        <ChevronRight size={18} className="hidden md:block text-gray-400 shrink-0" />
      </Link>
    </motion.div>
  );
}

export default LotsRow;
