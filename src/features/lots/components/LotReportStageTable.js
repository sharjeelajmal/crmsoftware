"use client";

import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { LotStageBadge } from "@/features/cutting/components/LotStageBadge";
import { stageRows } from "../utils";

const COLUMNS = [
  { key: "count", label: "Lots" },
  { key: "cutQty", label: "Cut" },
  { key: "stitchedQty", label: "Stitched" },
  { key: "washedQty", label: "Washed" },
];

/** Stage-wise totals: a table on md+, one card per stage on phones. */
export function LotReportStageTable({ byStage }) {
  const rows = stageRows(byStage);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm"
      data-testid="lot-report-stages"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 mb-3">
        <Layers size={18} className="text-primary" />
        Stage-wise
      </h2>

      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="py-2 font-semibold">Stage</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="py-2 font-semibold text-right">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              className="border-t border-gray-100"
              data-testid="lot-report-stage-row"
              data-stage={row.key}
            >
              <td className="py-2.5">
                <LotStageBadge stage={row.key} />
              </td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="py-2.5 text-right font-semibold text-gray-700">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {rows.map((row) => (
          <div key={row.key} className="p-3 rounded-xl border border-gray-100" data-stage={row.key}>
            <LotStageBadge stage={row.key} />
            <div className="grid grid-cols-4 gap-2 mt-3">
              {COLUMNS.map((col) => (
                <div key={col.key}>
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">{col.label}</p>
                  <p className="font-semibold text-gray-700">{row[col.key]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default LotReportStageTable;
