"use client";

import { formatDateTime } from "@/lib/format";
import { eventLabel, formatPieces } from "../utils";

/** Timeline of a lot's events (oldest first, as the API returns them). */
export function LotHistory({ events = [] }) {
  if (events.length === 0) return <p className="text-sm text-gray-500">No history yet.</p>;

  return (
    <ol className="relative border-l-2 border-gray-200 ml-2 space-y-5">
      {events.map((event, index) => (
        <li
          key={event._id || index}
          className="pl-5 relative"
          data-testid="lot-history-item"
          data-event-type={event.type}
        >
          <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-white" />
          <p className="font-semibold text-gray-800 leading-snug">{eventLabel(event.type)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(event.at)}
            {event.by?.name ? ` · ${event.by.name}` : ""}
            {event.qty != null ? ` · ${formatPieces(event.qty)}` : ""}
          </p>
          {event.note ? (
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line break-words">{event.note}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export default LotHistory;
