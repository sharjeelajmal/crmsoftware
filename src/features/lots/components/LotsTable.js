"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { LotsRow, LOTS_COLUMNS } from "./LotsRow";

const HEADER_CLASS = "hidden md:flex items-center gap-4 px-4 py-2 text-sm text-gray-500 font-medium";

export function LotsTable({ lots, emptyMessage = "No invoices found." }) {
  return (
    <>
      <div className={HEADER_CLASS}>
        <span className={LOTS_COLUMNS.lot}>Invoice #</span>
        <span className={LOTS_COLUMNS.product}>Article</span>
        <span className={LOTS_COLUMNS.qty}>Cut qty</span>
        <span className={LOTS_COLUMNS.stage}>Stage</span>
        <span className={LOTS_COLUMNS.by}>Created by</span>
        <span className={LOTS_COLUMNS.date}>Date</span>
        <span className="w-[18px]" aria-hidden="true" />
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
        {lots.length > 0 ? (
          lots.map((lot) => <LotsRow key={lot._id} lot={lot} />)
        ) : (
          <p className="text-center text-gray-500 py-10">{emptyMessage}</p>
        )}
      </motion.div>
    </>
  );
}

export default LotsTable;
