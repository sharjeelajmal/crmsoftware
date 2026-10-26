"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { formatMoney } from "@/lib/format";
import { ATTENDANCE_SHORT } from "@/constants/attendance";
import { BRAND } from "@/constants/brand";

const CELL = {
  present: "bg-success-soft text-success",
  absent: "bg-danger-soft text-danger",
  leave: "bg-yellow-50 text-yellow-700",
};

const dayDate = (day) => new Date(`${day}T12:00:00`);

/**
 * The month register: one line per worker (name with its P / A / L counts and pay cut) and one column per day. The
 * table scrolls sideways inside its card; the worker column stays put. `#attendance-print` is the print area.
 */
export function AttendanceMonth({ register, label, todayKey, onOpenDay }) {
  const { days, rows, totals } = register;
  const scroller = useRef(null);

  // Open the current month at today's column (the days before it scroll off to the left).
  useEffect(() => {
    const box = scroller.current;
    const today = box?.querySelector("[data-today]");
    if (box && today) box.scrollLeft = Math.max(0, today.offsetLeft - box.clientWidth / 2);
  }, [register.month]);

  return (
    <div id="attendance-print" className="space-y-4">
      <div className="hidden print:block">
        <h2 className="text-xl font-bold text-gray-800">{BRAND.name} · Attendance register</h2>
        <p className="text-sm text-gray-600">
          {label} · printed {new Date().toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600" data-testid="attendance-month-totals">
        <span>
          Present <b className="text-success tabular-nums">{totals.present}</b>
        </span>
        <span>
          Absent <b className="text-danger tabular-nums">{totals.absent}</b>
        </span>
        <span>
          Leave <b className="text-yellow-700 tabular-nums">{totals.leave}</b>
        </span>
        <span>
          Pay cut <b className="text-primary tabular-nums">{formatMoney(totals.cut)}</b>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-gray-500">No workers yet.</p>
      ) : (
        <div
          ref={scroller}
          className="rounded-2xl border border-gray-100 bg-white overflow-x-auto"
          data-testid="attendance-month"
        >
          <table className="min-w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="sticky left-0 z-10 bg-surface-muted px-3 py-2 text-left font-semibold min-w-44">
                  Worker · P / A / L · cut
                </th>
                {days.map((day) => {
                  const at = dayDate(day);
                  return (
                    <th
                      key={day}
                      className={`px-0.5 py-1 text-center font-semibold min-w-8 ${
                        day === todayKey ? "bg-primary-soft text-primary" : "bg-surface-muted"
                      }`}
                      data-today={day === todayKey ? "" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => onOpenDay(day)}
                        className="w-full cursor-pointer leading-tight hover:text-primary"
                        data-tip={`Mark ${format(at, "EEE d MMM")}`}
                        aria-label={`Open ${format(at, "d MMMM")}`}
                      >
                        <span className="block text-[10px] font-normal">{format(at, "EEEEE")}</span>
                        {format(at, "d")}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.workerId}
                  data-testid="attendance-month-row"
                  data-worker={row.name}
                  data-present={row.present}
                  data-absent={row.absent}
                  data-leave={row.leave}
                  data-cut={row.cut}
                >
                  {/* The counts sit under the name, so they stay in view while the days scroll sideways. */}
                  <td className="sticky left-0 z-10 bg-white border-t border-gray-100 px-3 py-1.5 whitespace-nowrap shadow-[1px_0_0_var(--color-border)]">
                    <span className="block font-semibold text-gray-800">{row.name}</span>
                    <span className="block text-[11px] text-gray-500 tabular-nums">
                      <b className="text-success">P {row.present}</b> · <b className="text-danger">A {row.absent}</b> ·{" "}
                      <b className="text-yellow-700">L {row.leave}</b>
                      {row.cut > 0 ? <b className="text-gray-800"> · − {formatMoney(row.cut)}</b> : null}
                    </span>
                  </td>
                  {days.map((day) => {
                    const status = row.marks[day];
                    return (
                      <td
                        key={day}
                        className="border-t border-gray-100 p-0.5 text-center"
                        data-day={day}
                        data-status={status}
                      >
                        <span
                          className={`grid place-items-center h-7 rounded-md text-xs font-bold ${
                            CELL[status] ?? "text-gray-300"
                          }`}
                        >
                          {status ? ATTENDANCE_SHORT[status] : "·"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AttendanceMonth;
