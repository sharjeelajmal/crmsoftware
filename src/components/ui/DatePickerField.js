"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { format, isSameDay, startOfDay, subDays } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { dateToValue, valueToDate } from "@/constants/datePresets";
import { BodyPortal } from "./BodyPortal";
import { CalendarDropdown } from "./CalendarDropdown";

const FIRST_YEAR = 2020;
const PANEL_WIDTH = 328;
const PANEL_HEIGHT = 330; // calendar + quick picks before the panel can be measured
const GAP = 8;
const EDGE = 12;

/** Field value ("yyyy-MM-dd", what forms send to the API) ⇄ Date; shared with forms that keep a Date. */
const toDate = (value) => valueToDate(value) ?? undefined;
const toValue = (date) => dateToValue(date);
export { dateToValue, valueToDate };

/**
 * Where the panel goes: under the field, or above it when there is more room there; then pulled inside the window
 * (on a very short screen it may cover the field rather than leave the screen). `height` = the measured panel.
 */
const placeFor = (trigger, height = PANEL_HEIGHT) => {
  const r = trigger.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2);
  const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - width - EDGE);
  const below = window.innerHeight - r.bottom - GAP - EDGE;
  const above = r.top - GAP - EDGE;
  const openUp = below < height && above > below;
  const wanted = openUp ? r.top - GAP - height : r.bottom + GAP;
  const top = Math.max(EDGE, Math.min(wanted, window.innerHeight - height - EDGE));
  return { left, width, top, up: openUp, origin: openUp ? "bottom left" : "top left" };
};

/**
 * Single-date field in the app's style: a button that shows the date ("Mon, 26 Oct 2026") and opens a small
 * calendar (same `.rdp-modern` theme as the range picker) with Today / Yesterday shortcuts. Value is a
 * "yyyy-MM-dd" string, like a native date input, so forms keep sending the same payload. The panel is rendered on
 * <body> so a modal's scroll area never clips it.
 */
export function DatePickerField({ id, value, onChange, className = "", testId, placeholder = "Pick a date" }) {
  const selected = toDate(value);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const [month, setMonth] = useState(selected ?? new Date());
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const today = startOfDay(new Date());

  const reposition = useCallback(() => {
    if (triggerRef.current) setPlace(placeFor(triggerRef.current, panelRef.current?.offsetHeight || PANEL_HEIGHT));
  }, []);

  const toggle = () => {
    if (!open) {
      reposition();
      setMonth(selected ?? new Date());
    }
    setOpen((was) => !was);
  };

  const pick = (date) => {
    if (date) onChange(toValue(date));
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Keep the panel next to the field while the page or the modal scrolls / resizes.
  useLayoutEffect(() => {
    if (!open) return undefined;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  // Close on a click outside the field and the panel, or on Escape (without closing the surrounding modal).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      if (event.target.closest?.(".dropdown-portal")) return; // the month / year menu lives on <body>
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const quick = [
    { label: "Today", date: today },
    { label: "Yesterday", date: subDays(today, 1) },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          "@container w-full flex items-center gap-2 p-3 bg-gray-100 rounded-xl text-left outline-none cursor-pointer " +
          "transition-colors hover:bg-gray-200/70 focus-visible:ring-2 focus-visible:ring-primary " +
          (open ? "ring-2 ring-primary bg-white " : "") +
          className
        }
        data-testid={testId}
        data-value={value || ""}
      >
        <CalendarDays size={18} className="shrink-0 text-primary" />
        <span className={`flex-1 min-w-0 truncate ${selected ? "text-gray-800 font-medium" : "text-gray-400"}`}>
          {selected ? (
            <>
              {/* Weekday only when the field is wide enough (a half-width field shows "26 Oct 2026"). */}
              <span className="hidden @2xs:inline">{format(selected, "EEE, ")}</span>
              {format(selected, "d MMM yyyy")}
            </>
          ) : (
            placeholder
          )}
        </span>
        {selected && isSameDay(selected, today) && (
          <span className="hidden @2xs:inline shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
            Today
          </span>
        )}
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <BodyPortal>
        <AnimatePresence>
          {open && place && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Choose a date"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: place.up ? 6 : -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.1 } }
                  : { opacity: 0, scale: 0.97, y: place.up ? 4 : -4, transition: { duration: 0.12, ease: "easeIn" } }
              }
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{
                position: "fixed",
                left: place.left,
                width: place.width,
                top: place.top,
                transformOrigin: place.origin,
              }}
              className="z-[60] rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/5"
              data-testid={testId ? `${testId}-panel` : undefined}
            >
              <div className="flex gap-2 mb-2">
                {quick.map(({ label, date }) => {
                  const active = selected && isSameDay(selected, date);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => pick(date)}
                      className={
                        "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer " +
                        (active
                          ? "bg-primary text-white"
                          : "bg-surface-muted text-gray-700 hover:bg-primary-soft hover:text-primary")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <DayPicker
                className="rdp-modern rdp-compact flex justify-center"
                mode="single"
                required
                selected={selected}
                onSelect={pick}
                month={month}
                onMonthChange={setMonth}
                weekStartsOn={1}
                captionLayout="dropdown"
                components={{ Dropdown: CalendarDropdown }}
                startMonth={new Date(FIRST_YEAR, 0)}
                endMonth={new Date(new Date().getFullYear() + 1, 11)}
                animate={!reduceMotion}
                formatters={{ formatMonthDropdown: (date) => format(date, "MMM") }}
                showOutsideDays
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </BodyPortal>
    </>
  );
}

export default DatePickerField;
