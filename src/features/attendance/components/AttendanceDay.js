"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { presentForUnmarked } from "@/constants/attendance";
import { Button } from "@/components/ui/Button";
import { StatusToggle } from "./StatusToggle";

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-white border border-gray-100 px-4 py-3">
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className={`text-xl font-bold tabular-nums [overflow-wrap:anywhere] ${tone}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

const STATUS_RING = {
  present: "border-success-border",
  absent: "border-danger-border",
  leave: "border-yellow-300",
};

/** One day's sheet: the counts, "mark everyone present", and a Present / Absent / Leave switch per worker. */
export function AttendanceDay({ sheet, onMark, isFetching = false }) {
  const { rows, counts } = sheet;
  const unmarked = presentForUnmarked(sheet);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-gray-500" data-testid="attendance-empty">
        No workers yet. Add them on{" "}
        <Link href="/workers" className="font-semibold text-primary hover:underline">
          Workers &amp; Rates
        </Link>
        .
      </p>
    );
  }

  return (
    <div className={`space-y-4 transition-opacity ${isFetching ? "opacity-80" : ""}`}>
      <div className="grid grid-cols-2 @xl:grid-cols-3 @4xl:grid-cols-5 gap-3">
        <Figure label="Present" value={counts.present} tone="text-success" testId="attendance-count-present" />
        <Figure label="Absent" value={counts.absent} tone="text-danger" testId="attendance-count-absent" />
        <Figure label="Leave" value={counts.leave} tone="text-yellow-600" testId="attendance-count-leave" />
        <Figure label="Not marked" value={counts.unmarked} testId="attendance-count-unmarked" />
        <Figure label="Pay cut this day" value={formatMoney(counts.cut)} tone="text-primary" testId="attendance-cut" />
      </div>

      <div className="flex flex-col @2xl:flex-row @2xl:items-center @2xl:justify-between gap-3">
        <p className="text-sm text-gray-500">
          Absent and leave cut one day of the worker&apos;s per-day salary. Tap a chosen status again to clear it.
        </p>
        <Button
          variant="secondary"
          icon={CheckCheck}
          onClick={() => onMark(unmarked)}
          disabled={unmarked.length === 0}
          className="whitespace-nowrap"
          data-testid="attendance-mark-all"
        >
          {unmarked.length === rows.length ? "Mark everyone present" : "Mark the rest present"}
          {unmarked.length ? ` (${unmarked.length})` : ""}
        </Button>
      </div>

      <ul className="space-y-2">
        {rows.map((row, index) => (
          <motion.li
            key={row.workerId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 15) * 0.02, duration: 0.2 }}
            className={`flex flex-col @2xl:flex-row @2xl:items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-colors ${
              STATUS_RING[row.status] ?? "border-gray-100"
            }`}
            data-testid="attendance-row"
            data-worker={row.name}
            data-status={row.status}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-primary-soft text-primary font-bold">
                {row.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-gray-800 truncate">
                  {row.name}
                  {!row.active && <span className="ml-2 text-xs font-normal text-gray-400">inactive</span>}
                </span>
                <span className="block text-xs text-gray-500 truncate">
                  {[row.type, row.dailyRate > 0 ? `${formatMoney(row.dailyRate)} a day` : "piece rate only"]
                    .filter(Boolean)
                    .join(" · ")}
                  {row.cut > 0 && (
                    <b className="text-danger" data-testid="attendance-row-cut">
                      {" "}
                      · − {formatMoney(row.cut)}
                    </b>
                  )}
                </span>
              </span>
            </div>
            <StatusToggle
              value={row.status}
              onChange={(status) => onMark([{ workerId: row.workerId, status }])}
              label={`Attendance of ${row.name}`}
              className="w-full @2xl:w-auto @2xl:min-w-80"
            />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default AttendanceDay;
