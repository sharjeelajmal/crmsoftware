"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { CalendarRange, Hourglass, Inbox, Send, Spool } from "lucide-react";
import { compactNumber, plural, shareParts } from "@/constants/dashboard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Panel } from "./Panel";

const ICON_TONES = {
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-amber-700",
};

// Where the received pieces are now, as one bar: out to washing, still left in stitching, short when stitching closed.
const PARTS = [
  { key: "outAll", label: "Out", swatch: "bg-primary" },
  { key: "left", label: "Left", swatch: "bg-warning" },
  { key: "short", label: "Short", swatch: "bg-chart-muted" },
];

const weekLabel = (week) => {
  const start = new Date(week?.start);
  const end = new Date(week?.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "this week";
  return `${format(start, "EEE d MMM")} – ${format(end, "EEE d MMM")}`;
};

function Figure({ icon: Icon, label, value, hint, tone = "primary", testId }) {
  return (
    <div
      className="min-w-0 flex flex-col rounded-xl border border-border/70 bg-surface-muted/70 p-3 sm:p-3.5"
      data-testid={testId}
      data-value={value}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs sm:text-sm font-medium text-gray-500 leading-snug">{label}</p>
        <span className={`grid place-items-center w-7 h-7 rounded-lg shrink-0 ${ICON_TONES[tone]}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-1 flex items-baseline gap-1 text-gray-800">
        <AnimatedNumber
          value={value}
          format={compactNumber}
          className="text-xl sm:text-2xl font-bold tracking-tight"
          testId={`${testId}-value`}
        />
        <span className="text-xs font-medium text-gray-500">pcs</span>
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 truncate">{hint}</p>
    </div>
  );
}

/**
 * The owner's stitching picture at the top of the dashboard (client, 2026-11-23): every cut piece that came to
 * stitching, what went out to washing this week and in all, and what is still left (baqaya). `pieces` is
 * `stitchingPieces` from GET /api/dashboard; Left is the same number as "Lying" on the Stitching page.
 */
export function StitchingPieces({ pieces }) {
  const { parts } = shareParts(PARTS.map((part) => ({ ...part, value: pieces[part.key] })));
  const visible = parts.filter((part) => part.share > 0);
  const legend = parts.filter((part) => part.key !== "short" || part.value > 0);

  return (
    <Panel
      icon={Spool}
      title="Stitching pieces"
      subtitle="Cut pieces that came to stitching, sent out to washing, and still left"
      href="/stitching"
      linkLabel="Stitching"
      testId="dash-stitch-pieces"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Figure
          icon={Inbox}
          label="Total received"
          value={pieces.received}
          hint="every invoice sent to stitching"
          testId="dash-stitch-received"
        />
        <Figure
          icon={CalendarRange}
          label="Out this week"
          value={pieces.outWeek}
          hint={weekLabel(pieces.week)}
          testId="dash-stitch-out-week"
        />
        <Figure
          icon={Send}
          label="Out in all"
          value={pieces.outAll}
          hint="on washing gate passes"
          testId="dash-stitch-out-all"
        />
        <Figure
          icon={Hourglass}
          label="Left (baqaya)"
          value={pieces.left}
          hint={`lying in ${pieces.lots} ${plural(pieces.lots, "invoice")}`}
          tone={pieces.left > 0 ? "warning" : "primary"}
          testId="dash-stitch-left"
        />
      </div>

      <div className="mt-3.5 flex h-2 gap-0.5" aria-hidden="true">
        {visible.length === 0 ? (
          <div className="flex-1 rounded-full bg-surface-muted" />
        ) : (
          visible.map((part, index) => (
            <motion.div
              key={part.key}
              className={`h-full ${part.swatch} ${index === 0 ? "rounded-l-full" : ""} ${index === visible.length - 1 ? "rounded-r-full" : ""}`}
              initial={{ width: 0 }}
              animate={{ width: `${part.share * 100}%` }}
              transition={{ duration: 0.9, delay: 0.1 * index, ease: [0.16, 1, 0.3, 1] }}
            />
          ))
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
        {legend.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm shrink-0 ${part.swatch}`} aria-hidden="true" />
            {part.label}
            <span className="font-semibold text-gray-700 tabular-nums">{compactNumber(part.value)}</span>
            {part.key === "short" && <span>(fewer stitched than cut)</span>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default StitchingPieces;
