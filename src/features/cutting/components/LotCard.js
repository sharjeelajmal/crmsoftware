"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Scissors, ChevronRight } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { formatDate } from "@/lib/format";
import { formatPieces } from "../utils";
import { LotStageBadge } from "./LotStageBadge";

const CARD_CLASS =
  "flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300";

/** One lot in the "My Lots" list; the whole card links to the lot's detail page. */
export function LotCard({ lot, href }) {
  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Link href={href} data-testid="lot-card" data-lot-number={lot.lotNumber} className={CARD_CLASS}>
        <div className="p-3 rounded-full bg-primary-soft text-primary shrink-0">
          <Scissors size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-gray-800">{lot.lotNumber}</span>
            <LotStageBadge stage={lot.stage} />
          </div>
          <p className="text-gray-700 truncate mt-0.5">{lot.productName}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatPieces(lot.cutQty)} · {formatDate(lot.createdAt)}
          </p>
        </div>
        <ChevronRight size={20} className="text-gray-400 shrink-0" />
      </Link>
    </motion.div>
  );
}

export default LotCard;
