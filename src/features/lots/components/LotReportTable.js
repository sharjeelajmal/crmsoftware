"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { LotReportRow, REPORT_COLUMNS } from "./LotReportRow";

const HEADER_CLASS = "hidden md:flex items-center gap-4 px-4 py-2 text-sm text-gray-500 font-medium";

/** Detailed lot list of the report: header + rows (cards on phones). */
export function LotReportTable({ rows, emptyMessage = "No lots in this period." }) {
  return (
    <>
      <div className={HEADER_CLASS}>
        <span className={REPORT_COLUMNS.lot}>Lot #</span>
        <span className={REPORT_COLUMNS.product}>Article</span>
        <span className={REPORT_COLUMNS.stage}>Stage</span>
        <span className={REPORT_COLUMNS.qty}>Cut</span>
        <span className={REPORT_COLUMNS.qty}>Stitched</span>
        <span className={REPORT_COLUMNS.qty}>Washed</span>
        <span className={REPORT_COLUMNS.shortfall}>Shortfall</span>
        <span className={REPORT_COLUMNS.by}>Created by</span>
        <span className={REPORT_COLUMNS.date}>Created</span>
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => <LotReportRow key={row.lotNumber} row={row} />)
        ) : (
          <p className="text-center text-gray-500 py-10">{emptyMessage}</p>
        )}
      </motion.div>
    </>
  );
}

export default LotReportTable;
