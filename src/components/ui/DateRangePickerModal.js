"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { ArrowRight, CalendarRange, Check, RotateCcw, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { DATE_PRESETS, activePresetKey, nextRange, presetRange, rangeDays } from "@/constants/datePresets";

const EMPTY = { from: undefined, to: undefined };
const FIRST_YEAR = 2020;
const SPRING = { type: "spring", stiffness: 380, damping: 32 };

/**
 * The left-hand month to show. Two months: a range inside one month sits on the right with the previous
 * month on the left (recent days are usually in the past); a longer range starts on the left.
 */
const monthFor = (range, twoMonths) => {
  const from = range?.from;
  const to = range?.to || from;
  if (!from) return twoMonths ? subMonths(new Date(), 1) : new Date();
  if (!twoMonths) return from;
  const sameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
  return sameMonth ? subMonths(to, 1) : from;
};

/** "From" / "To" box in the header; the value cross-fades when it changes. */
function EndBox({ label, date, active, testId }) {
  return (
    <div
      className={
        "flex-1 min-w-0 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 transition-all duration-300 " +
        (active ? "bg-white text-primary shadow-lg ring-2 ring-white/70" : "bg-white/15 text-white")
      }
      data-testid={testId}
    >
      <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-primary/70" : "text-white/70"}`}>
        {label}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={date ? date.toDateString() : "empty"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="font-bold text-sm sm:text-base truncate"
        >
          {date ? (
            <>
              <span className="hidden min-[420px]:inline">{format(date, "EEE, ")}</span>
              {format(date, "d MMM yyyy")}
            </>
          ) : (
            "Select a day"
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/**
 * Modern date range picker: brand header with the live From → To summary, quick presets, a two-month
 * calendar (one on phones, shown as a bottom sheet) and Clear / Apply. The selection stays local until
 * "Apply"; closing discards it. `onChange` (optional) mirrors every change for controlled callers.
 * Render inside <AnimatePresence>.
 */
export function DateRangePickerModal({ initialRange, onApply, onClose, onChange, title = "Custom range" }) {
  // Two months + the presets column need ~830px; below that one month (presets on the side from 640px).
  const twoMonths = useMediaQuery("(min-width: 900px)");
  // Very narrow phones: "Sep" instead of "September" so the month arrows keep their room.
  const narrow = useMediaQuery("(max-width: 399px)");
  const presetsRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState(() => ({ ...EMPTY, ...initialRange }));
  const [month, setMonth] = useState(() => monthFor(initialRange, false));
  const days = rangeDays(range);
  const activeKey = activePresetKey(range);
  const complete = Boolean(range.from && range.to);
  const picking = range.from && !range.to ? "to" : "from";

  // Show both months of the initial range once we know the screen is wide enough.
  useEffect(() => {
    if (twoMonths) setMonth(monthFor(initialRange, true));
  }, [twoMonths]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the layout switches

  useEffect(() => {
    const row = presetsRef.current;
    const active = row?.querySelector('[aria-pressed="true"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
  }, [activeKey]);

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (next) => {
    setRange(next);
    onChange?.(next);
  };
  const pickPreset = (key) => {
    const next = presetRange(key);
    update(next);
    setMonth(monthFor(next, twoMonths));
  };

  const hint = complete
    ? `${days} ${days === 1 ? "day" : "days"} selected`
    : range.from
      ? "Now pick the last day"
      : "Pick the first day, or choose a quick range";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 48, scale: twoMonths ? 0.96 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 48, scale: twoMonths ? 0.96 : 1 }}
        transition={SPRING}
        onClick={(e) => e.stopPropagation()}
        className={
          "relative w-full sm:w-auto sm:max-w-[min(860px,calc(100vw-2rem))] bg-white shadow-2xl overflow-hidden " +
          "rounded-t-3xl sm:rounded-3xl max-h-[94vh] flex flex-col"
        }
        data-testid="date-range-picker"
      >
        {/* Header: title + live From → To summary */}
        <div
          className={
            "relative bg-gradient-to-br from-primary via-primary to-primary-light px-4 pt-3 pb-3.5 sm:px-6 sm:pt-5 " +
            "sm:pb-4 text-white overflow-hidden shrink-0"
          }
        >
          <div className="sm:hidden mx-auto mb-2.5 h-1 w-10 rounded-full bg-white/40" aria-hidden="true" />
          <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-white/10" aria-hidden="true" />
          <div className="absolute -bottom-20 left-1/3 w-40 h-40 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
            <h3 className="flex items-center gap-2 text-base sm:text-xl font-bold">
              <span className="grid place-items-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15">
                <CalendarRange size={20} />
              </span>
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 hover:rotate-90 transition-all duration-300 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative flex items-center gap-2 sm:gap-3">
            <EndBox label="From" date={range.from} active={picking === "from" && !complete} testId="range-from" />
            <motion.span
              animate={complete ? { x: [0, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.5 }}
              className="shrink-0 text-white/80"
            >
              <ArrowRight size={18} />
            </motion.span>
            <EndBox label="To" date={range.to} active={picking === "to"} testId="range-to" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0 overflow-y-auto">
          {/* Quick presets: a column on desktop, a swipeable row on phones */}
          <div className="shrink-0 sm:w-44 sm:border-r border-gray-100 bg-surface-muted/60">
            <p className="hidden sm:block px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Quick ranges
            </p>
            <div
              ref={presetsRef}
              className={
                "flex sm:flex-col gap-1.5 overflow-x-auto scrollbar-hidden px-3 py-2.5 sm:py-3 sm:pt-1 " +
                "[mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]"
              }
              data-testid="range-presets"
            >
              {DATE_PRESETS.map((preset) => {
                const active = activeKey === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => pickPreset(preset.key)}
                    className={
                      "relative shrink-0 text-left whitespace-nowrap px-3 py-2 rounded-xl text-sm font-semibold " +
                      "transition-colors duration-200 cursor-pointer " +
                      (active ? "text-white" : "text-gray-600 hover:text-primary hover:bg-primary-soft")
                    }
                    data-testid={`range-preset-${preset.key}`}
                    aria-pressed={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="range-preset-pill"
                        transition={SPRING}
                        className="absolute inset-0 rounded-xl bg-primary shadow-brand"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      {active && <Check size={14} />}
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex justify-center px-2 py-3 sm:px-5 sm:py-4">
            <DayPicker
              className="rdp-modern"
              mode="range"
              selected={range}
              onSelect={(proposed, clicked) => update(nextRange(range, proposed, clicked))}
              month={month}
              onMonthChange={setMonth}
              numberOfMonths={twoMonths ? 2 : 1}
              weekStartsOn={1}
              captionLayout="dropdown"
              startMonth={new Date(FIRST_YEAR, 0)}
              endMonth={new Date(new Date().getFullYear() + 1, 11)}
              animate={!reduceMotion}
              formatters={{ formatMonthDropdown: (date) => format(date, narrow ? "MMM" : "MMMM") }}
              showOutsideDays
            />
          </div>
        </div>

        {/* Footer: live hint + actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 px-4 py-3 sm:px-6 border-t border-gray-100 bg-white shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={hint}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              className={`min-w-0 text-xs sm:text-sm font-medium leading-snug ${complete ? "text-primary" : "text-gray-500"}`}
              data-testid="range-hint"
            >
              {hint}
            </motion.p>
          </AnimatePresence>
          <div className="flex shrink-0 gap-1 sm:gap-3">
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={() => update({ ...EMPTY })}
              disabled={!range.from}
              aria-label="Clear"
              title="Clear"
              className="px-3 sm:px-6"
              data-testid="range-clear"
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>
            <Button
              icon={Check}
              onClick={() => onApply(range)}
              disabled={!complete}
              className="whitespace-nowrap px-4 sm:px-6"
              data-testid="range-apply"
            >
              <span>
                Apply<span className="hidden min-[360px]:inline"> range</span>
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DateRangePickerModal;
