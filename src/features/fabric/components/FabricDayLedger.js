"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { valueToDate } from "@/constants/datePresets";
import { formatFabricQty } from "@/constants/fabric";

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,7.5rem))_20px] items-center gap-3";

const qtyOrBlank = (qty, unit) => (qty ? formatFabricQty(qty, unit) : "—");

function DayRow({ row, unit, index }) {
  const date = valueToDate(row.day);
  const count = [row.receipts ? `${row.receipts} received` : "", row.cuts ? `${row.cuts} cut` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.02, duration: 0.2 }}
      className="border-t border-gray-100"
      data-testid="fabric-day-row"
      data-day={row.day}
      data-balance={row.balance}
    >
      <Link
        href={`/fabric/report?day=${row.day}`}
        className="block px-3 @3xl:px-4 py-2.5 text-sm hover:bg-surface-muted transition-colors"
        data-tip="Open this day's cutting report"
      >
        {/* Wide: columns */}
        <div className={`hidden @2xl:grid ${COLUMNS}`}>
          <span className="min-w-0">
            <span className="block font-semibold text-gray-800">
              {date ? format(date, "EEE, d MMM yyyy") : row.day}
            </span>
            <span className="block text-xs text-gray-500 truncate">{count}</span>
          </span>
          <span className="text-right font-semibold text-success tabular-nums">{qtyOrBlank(row.received, unit)}</span>
          <span className="text-right font-semibold text-gray-800 tabular-nums">{qtyOrBlank(row.used, unit)}</span>
          <span className={`text-right font-bold tabular-nums ${row.balance < 0 ? "text-danger" : "text-primary"}`}>
            {formatFabricQty(row.balance, unit)}
          </span>
          <ChevronRight size={16} className="text-gray-400" />
        </div>
        {/* Narrow: compact card */}
        <div className="@2xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-gray-800">{date ? format(date, "EEE, d MMM yyyy") : row.day}</span>
            <span className={`font-bold tabular-nums ${row.balance < 0 ? "text-danger" : "text-primary"}`}>
              {formatFabricQty(row.balance, unit)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 tabular-nums">
            {row.received > 0 && (
              <span>
                Received <b className="text-success">{formatFabricQty(row.received, unit)}</b>
              </span>
            )}
            {row.used > 0 && (
              <span>
                Used <b className="text-gray-800">{formatFabricQty(row.used, unit)}</b>
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.li>
  );
}

/**
 * Day-by-day khata: opening balance, then one line per day with fabric received, fabric used in cutting and the
 * balance in hand at the end of that day, then the closing balance. One block per unit. Each day opens its report.
 */
export function FabricDayLedger({ ledger }) {
  if (ledger.length === 0) {
    return (
      <p
        className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-500"
        data-testid="fabric-days-empty"
      >
        Nothing received or cut in this period.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {ledger.map((block) => (
        <div
          key={block.unit}
          className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
          data-testid="fabric-day-ledger"
          data-unit={block.unit}
        >
          <div className={`hidden @2xl:grid ${COLUMNS} px-4 py-2 bg-surface-muted text-xs font-semibold text-gray-500`}>
            <span>Day</span>
            <span className="text-right">Received</span>
            <span className="text-right">Used in cutting</span>
            <span className="text-right">In hand</span>
            <span />
          </div>
          <ul>
            <li className="flex justify-between gap-3 px-3 @3xl:px-4 py-2.5 text-sm bg-primary-soft/40">
              <span className="font-semibold text-gray-700">Opening balance</span>
              <span className="font-bold text-gray-800 tabular-nums" data-testid="fabric-opening">
                {formatFabricQty(block.opening, block.unit)}
              </span>
            </li>
            {block.days.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-500 border-t border-gray-100">
                Nothing received or cut in this period.
              </li>
            ) : (
              block.days.map((row, index) => <DayRow key={row.day} row={row} unit={block.unit} index={index} />)
            )}
            <li className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 @3xl:px-4 py-3 text-sm border-t-2 border-gray-200">
              <span className="font-bold text-gray-800">
                Closing balance
                <span className="block text-xs font-normal text-gray-500">
                  Received {formatFabricQty(block.received, block.unit)} · Used{" "}
                  {formatFabricQty(block.used, block.unit)}
                </span>
              </span>
              <span
                className={`font-bold tabular-nums ${block.closing < 0 ? "text-danger" : "text-primary"}`}
                data-testid="fabric-closing"
              >
                {formatFabricQty(block.closing, block.unit)}
              </span>
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}

export default FabricDayLedger;
