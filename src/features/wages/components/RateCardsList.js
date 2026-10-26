"use client";

import { motion } from "framer-motion";
import { ListChecks, Pencil } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { MAIN_OPERATION_LABELS, groupOperations } from "@/constants/operations";
import { Button } from "@/components/ui/Button";

const SHOWN = 8;

/**
 * One card per category: its operations (grouped by main operation) and the labour per piece, or a note that every
 * operation is offered while it has no rate card.
 */
export function RateCardsList({ categories, onEdit }) {
  if (categories.length === 0) {
    return (
      <p className="text-center text-gray-500 py-10">
        No categories yet. Add them in Inventory (e.g. Baggy Pent, Simple Pent).
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {categories.map((card, index) => {
        const groups = groupOperations(card.items);
        const hidden = Math.max(0, card.items.length - SHOWN);
        let shown = 0;
        return (
          <motion.li
            key={card.category}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.04, duration: 0.25 }}
            className="flex flex-col rounded-2xl border border-gray-100 bg-white p-4"
            data-testid="rate-card"
            data-category={card.category}
            data-total={card.perPiece}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-gray-800 [overflow-wrap:anywhere]">{card.category}</p>
                <p className="text-xs text-gray-500">
                  {card.articles} article{card.articles === 1 ? "" : "s"}
                </p>
              </div>
              {card.items.length > 0 && (
                <p className="shrink-0 text-right">
                  <span className="block text-xl font-bold text-primary tabular-nums">
                    {formatMoney(card.perPiece)}
                  </span>
                  <span className="block text-[11px] text-gray-500">per piece</span>
                </p>
              )}
            </div>

            {card.items.length === 0 ? (
              <div className="mt-3 flex-1">
                <p className="rounded-xl bg-surface-muted px-3 py-2.5 text-xs text-gray-600">
                  No rate card yet — every operation is offered for this category at its own rate.
                </p>
              </div>
            ) : (
              <div className="mt-3 flex-1 space-y-2">
                {groups.map((group) => (
                  <div key={group.stage}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      {MAIN_OPERATION_LABELS[group.stage]}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {group.operations.map((item) => {
                        shown += 1;
                        if (shown > SHOWN) return null;
                        return (
                          <span
                            key={item.operationId}
                            className="rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary"
                          >
                            {item.name} · {item.rate}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {hidden > 0 && <p className="text-xs text-gray-500">+{hidden} more</p>}
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={card.items.length ? Pencil : ListChecks}
              className="mt-4 w-full"
              onClick={() => onEdit(card)}
              data-testid="rate-card-edit"
            >
              {card.items.length ? "Edit rate card" : "Set operations & rates"}
            </Button>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default RateCardsList;
