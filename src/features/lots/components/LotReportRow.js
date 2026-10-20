"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { LotStageBadge } from "@/features/cutting/components/LotStageBadge";
import { formatQty, isShortfall, stageKeyFromLabel } from "../utils";

/** Column widths shared with the table header. */
export const REPORT_COLUMNS = {
  lot: "md:w-28",
  product: "md:flex-1",
  stage: "md:w-32",
  qty: "md:w-20 md:text-right",
  shortfall: "md:w-24 md:text-right",
  by: "md:w-32",
  date: "md:w-24",
};

function Stat({ label, children, className = "" }) {
  return (
    <div className={`md:hidden ${className}`}>
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <div className="font-semibold text-gray-700">{children}</div>
    </div>
  );
}

function Shortfall({ value }) {
  if (value === "" || value === null || value === undefined) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={
        "inline-block px-2 py-0.5 rounded-md text-sm font-semibold " +
        (isShortfall(value) ? "bg-danger-soft text-danger" : "bg-success-soft text-success")
      }
    >
      {isShortfall(value) ? `-${value}` : value}
    </span>
  );
}

/** One report row: a table row on md+, a card on phones. Rows with a shortfall are tinted. */
export function LotReportRow({ row }) {
  const stage = stageKeyFromLabel(row.stage);
  const highlighted = isShortfall(row.shortfall);

  return (
    <motion.div variants={itemVariants}>
      <div
        data-testid="lot-report-row"
        data-lot-number={row.lotNumber}
        data-shortfall={row.shortfall}
        className={
          "flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-xl shadow-sm transition-shadow " +
          (highlighted ? "bg-danger-soft/50 border border-danger-border" : "bg-white hover:shadow-md")
        }
      >
        <div className="flex items-center justify-between md:contents">
          <span className={`font-bold text-gray-800 ${REPORT_COLUMNS.lot}`}>{row.lotNumber}</span>
          <span className="md:hidden">
            <LotStageBadge stage={stage} />
          </span>
        </div>
        <span className={`text-gray-700 truncate ${REPORT_COLUMNS.product}`}>{row.product}</span>
        <span className={`hidden md:inline ${REPORT_COLUMNS.stage}`}>
          <LotStageBadge stage={stage} />
        </span>
        <span className={`hidden md:inline text-gray-700 ${REPORT_COLUMNS.qty}`}>{formatQty(row.cutQty)}</span>
        <span className={`hidden md:inline text-gray-700 ${REPORT_COLUMNS.qty}`}>{formatQty(row.stitchedQty)}</span>
        <span className={`hidden md:inline text-gray-700 ${REPORT_COLUMNS.qty}`}>{formatQty(row.washedQty)}</span>
        <span className={`hidden md:inline ${REPORT_COLUMNS.shortfall}`}>
          <Shortfall value={row.shortfall} />
        </span>
        <span className={`hidden md:inline text-gray-600 truncate ${REPORT_COLUMNS.by}`}>{row.createdBy || "—"}</span>
        <span className={`hidden md:inline text-gray-600 text-xs ${REPORT_COLUMNS.date}`}>{row.createdAt}</span>

        <div className="grid grid-cols-4 gap-2 md:hidden border-t border-gray-100 pt-3">
          <Stat label="Cut">{formatQty(row.cutQty)}</Stat>
          <Stat label="Stitched">{formatQty(row.stitchedQty)}</Stat>
          <Stat label="Washed">{formatQty(row.washedQty)}</Stat>
          <Stat label="Shortfall">
            <Shortfall value={row.shortfall} />
          </Stat>
          <Stat label="Created by" className="col-span-2">
            {row.createdBy || "—"}
          </Stat>
          <Stat label="Created" className="col-span-2">
            <span className="text-xs">{row.createdAt}</span>
          </Stat>
        </div>
      </div>
    </motion.div>
  );
}

export default LotReportRow;
