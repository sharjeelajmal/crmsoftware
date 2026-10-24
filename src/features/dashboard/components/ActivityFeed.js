"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { Activity, Droplets, PackageCheck, Pencil, Scissors, Spool, Truck, Undo2 } from "lucide-react";
import { eventLabel } from "@/features/cutting/utils";
import { Panel, PanelEmpty } from "./Panel";

// Event type → icon and the tint of its dot on the timeline (stage colours, as on the lot pages).
const EVENT_STYLE = {
  created: { icon: Scissors, tint: "bg-gray-100 text-gray-700" },
  edited: { icon: Pencil, tint: "bg-gray-100 text-gray-700" },
  sent_stitching: { icon: Truck, tint: "bg-yellow-100 text-yellow-800" },
  dispatched: { icon: Truck, tint: "bg-primary-soft text-primary" },
  stitched: { icon: Spool, tint: "bg-yellow-100 text-yellow-800" },
  washed: { icon: Droplets, tint: "bg-primary-soft text-primary" },
  ready: { icon: PackageCheck, tint: "bg-success-soft text-success" },
  reversed: { icon: Undo2, tint: "bg-danger-soft text-danger" },
};

const FALLBACK = { icon: Activity, tint: "bg-gray-100 text-gray-700" };

/** Latest production events across all lots, newest first. */
export function ActivityFeed({ events, className = "" }) {
  return (
    <Panel
      icon={Activity}
      title="Recent activity"
      subtitle="Latest production updates"
      href="/lots/report"
      linkLabel="Report"
      className={className}
      testId="dash-activity"
    >
      {events.length === 0 ? (
        <PanelEmpty icon={Activity} title="No activity yet" hint="Cutting entries and stage changes appear here." />
      ) : (
        <ol className="relative">
          {events.map((event, index) => {
            const style = EVENT_STYLE[event.type] ?? FALLBACK;
            const Icon = style.icon;
            const qty = Number(event.qty);
            return (
              <motion.li
                key={event._id}
                className="relative flex gap-3 pb-4 last:pb-0"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                data-testid="dash-activity-item"
              >
                {index < events.length - 1 && (
                  <span className="absolute left-4 top-9 bottom-0 w-px bg-border" aria-hidden="true" />
                )}
                <span
                  className={`relative grid place-items-center w-8 h-8 rounded-full shrink-0 ring-4 ring-white ${style.tint}`}
                >
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm text-gray-800 leading-snug">
                    <span className="font-semibold">{eventLabel(event.type)}</span>
                    {Number.isFinite(qty) && event.qty !== null && (
                      <span className="text-gray-500"> · {Math.abs(qty).toLocaleString("en-US")} pcs</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    <Link href={`/lots/${event.lotId}`} className="font-semibold text-primary hover:underline">
                      {event.lotNumber}
                    </Link>{" "}
                    {event.productName}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {event.byName || "—"} ·{" "}
                    <time dateTime={new Date(event.at).toISOString()}>
                      {formatDistanceToNowStrict(new Date(event.at), { addSuffix: true })}
                    </time>
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export default ActivityFeed;
