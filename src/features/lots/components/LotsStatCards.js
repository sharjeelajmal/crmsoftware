"use client";

import { motion } from "framer-motion";
import { FileText, Inbox, Layers, Loader2, PackageCheck, Scissors, Send, Shirt } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { STAGE_PIECE_KEYS, STAGE_PIECE_LABELS, stagePieces } from "@/constants/stagePieces";

const STAGE_ICONS = { invoices: FileText, received: Inbox, out: Send, lying: Shirt };

const pcs = (n) => `${n.toLocaleString("en-US")} pcs`;

/** "All": the overview from GET /api/lots/summary. */
const overviewCards = (summary) => [
  { key: "newLots", icon: Scissors, title: "New invoices", value: summary?.newLots ?? 0 },
  { key: "inProcess", icon: Loader2, title: "In process", value: summary?.inProcess ?? 0 },
  { key: "ready", icon: PackageCheck, title: "Ready", value: summary?.ready ?? 0 },
  { key: "todayPieces", icon: Layers, title: "Today's pieces", value: summary?.today?.pieces ?? 0 },
];

/** A stage tab: that stage's invoices and pieces — came in, gone on, still lying (src/constants/stagePieces.js). */
const stageCards = (lots, stage) => {
  const totals = stagePieces(lots, stage);
  const labels = STAGE_PIECE_LABELS[stage];
  return STAGE_PIECE_KEYS.map((key) => ({
    key,
    icon: STAGE_ICONS[key],
    title: labels[key],
    value: totals[key],
    shown: key === "invoices" ? totals[key] : pcs(totals[key]),
    // Pieces lost at this stage, so the boxes add up: received = sent on + lying + short.
    note: key === "received" && totals.short > 0 ? `${pcs(totals.short)} short` : undefined,
  }));
};

/**
 * The four boxes on top of the Invoices page. They follow the stage tab (not the search box): `lots` must be every
 * invoice, since a stage's "received" and "sent on" also count invoices that have moved past it.
 */
export function LotsStatCards({ stage, lots, summary }) {
  const cards = stage && STAGE_PIECE_LABELS[stage] ? stageCards(lots, stage) : overviewCards(summary);
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6"
      data-testid="lots-stats"
      data-stage={stage || "all"}
    >
      {cards.map((card, index) => (
        // Keyed by position: switching tabs updates the same tiles instead of mounting new (hidden) ones.
        <StatCard
          key={index}
          icon={card.icon}
          title={card.title}
          value={card.shown ?? card.value}
          note={card.note}
          data-testid={`lots-stat-${card.key}`}
          data-value={card.value}
        />
      ))}
    </motion.div>
  );
}

export default LotsStatCards;
