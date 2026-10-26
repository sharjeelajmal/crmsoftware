"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { addDays, format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ListChecks, Printer } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { dateToValue, valueToDate } from "@/constants/datePresets";
import { monthLabel, shiftMonth } from "@/constants/attendance";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useAttendanceDay } from "@/features/attendance/hooks/useAttendanceDay";
import { useAttendanceMonth } from "@/features/attendance/hooks/useAttendanceMonth";
import { AttendanceDay } from "@/features/attendance/components/AttendanceDay";
import { AttendanceMonth } from "@/features/attendance/components/AttendanceMonth";

const STEP_CLASS =
  "grid place-items-center w-12 shrink-0 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-primary " +
  "hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
const tabClass = (active) =>
  "flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold " +
  "transition-colors cursor-pointer " +
  (active ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-100");

const todayKey = () => format(new Date(), "yyyy-MM-dd");

export default function AttendancePage() {
  const [view, setView] = useState("day");
  const [day, setDay] = useState(todayKey);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const today = todayKey();
  const dayData = useAttendanceDay(day);
  const monthData = useAttendanceMonth(month, { enabled: view === "month" });
  const step = (days) => setDay(dateToValue(addDays(valueToDate(day), days)));
  const openDay = (key) => {
    setDay(key);
    setView("day");
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="@container space-y-6 max-w-7xl mx-auto"
      data-testid="attendance-page"
    >
      <motion.div variants={itemVariants} className="print:hidden">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Attendance</h1>
        <p className="text-gray-500 mt-1">
          Mark every worker present, absent or on leave. Absent and leave days are cut from the wages by themselves.
        </p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="flex flex-col @3xl:flex-row @3xl:items-center @3xl:justify-between gap-3 print:hidden"
      >
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl w-full sm:w-auto shadow-sm" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "day"}
            onClick={() => setView("day")}
            className={tabClass(view === "day")}
            data-testid="attendance-tab-day"
          >
            <ListChecks size={16} /> Mark a day
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "month"}
            onClick={() => setView("month")}
            className={tabClass(view === "month")}
            data-testid="attendance-tab-month"
          >
            <CalendarDays size={16} /> Month register
          </button>
        </div>

        {view === "day" ? (
          <div className="flex gap-2 @3xl:w-96">
            <button
              type="button"
              className={STEP_CLASS}
              onClick={() => step(-1)}
              aria-label="Previous day"
              data-tip="Previous day"
              data-testid="attendance-prev-day"
            >
              <ChevronLeft size={20} />
            </button>
            <DatePickerField
              id="attendance-day"
              value={day}
              onChange={(value) => value && setDay(value)}
              className="flex-1 min-w-0"
              testId="attendance-day"
            />
            <button
              type="button"
              className={STEP_CLASS}
              onClick={() => step(1)}
              disabled={day >= today}
              aria-label="Next day"
              data-tip="Next day"
              data-testid="attendance-next-day"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={STEP_CLASS}
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              data-tip="Previous month"
              data-testid="attendance-prev-month"
            >
              <ChevronLeft size={20} />
            </button>
            <span
              className="flex flex-1 items-center justify-center min-h-12 min-w-0 @md:min-w-44 px-4 rounded-xl bg-white border border-gray-200 font-semibold text-gray-800"
              data-testid="attendance-month-label"
            >
              {monthLabel(month)}
            </span>
            <button
              type="button"
              className={STEP_CLASS}
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= today.slice(0, 7)}
              aria-label="Next month"
              data-tip="Next month"
              data-testid="attendance-next-month"
            >
              <ChevronRight size={20} />
            </button>
            <Button
              variant="secondary"
              icon={Printer}
              className="w-full @md:w-auto whitespace-nowrap"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants}>
        {view === "day" ? (
          dayData.isLoading || !dayData.sheet ? (
            <Loader inline />
          ) : (
            <AttendanceDay sheet={dayData.sheet} onMark={dayData.mark} isFetching={dayData.isFetching} />
          )
        ) : monthData.register ? (
          <AttendanceMonth
            register={monthData.register}
            label={monthLabel(month)}
            todayKey={today}
            onOpenDay={openDay}
          />
        ) : (
          <Loader inline />
        )}
      </motion.div>
    </motion.div>
  );
}
