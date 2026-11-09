"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, HardHat, Trash2, UserPlus } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Loader } from "@/components/ui/Loader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { operationProgress } from "@/constants/operations";
import { plural } from "@/constants/dashboard";
import { PAY_TYPE_LABELS, payLabel, workBatches, workByWorker, workPiecesOf } from "@/constants/wages";
import { useLotWork } from "../hooks/useLotWork";
import { useLotOperations } from "../hooks/useLotOperations";
import { groupByOperation, workerWorkLine } from "../utils";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";
const LIST_CLASS = "divide-y divide-gray-100 rounded-xl border border-gray-100";
const VIEWS = [
  { value: "operations", label: "Operations" },
  { value: "workers", label: "Workers" },
  { value: "history", label: "History" },
];

const chipClass = (op) =>
  op.complete
    ? "bg-success-soft text-success"
    : op.pieces > 0
      ? "bg-yellow-50 text-yellow-800"
      : "bg-surface-muted text-gray-600";

/**
 * Admin card on the invoice page: the labour on this invoice, the "Assign work" sheet, how far each operation of its
 * rate card has got, and the work three ways — per operation (with remove), per worker (operations, pieces, pay)
 * and the history of each save (when, by whom, how many workers).
 */
export function WorkPanel({ lot }) {
  const { entries, totals, isLoading, removeEntry } = useLotWork(lot);
  const offer = useLotOperations(lot?._id);
  const lotPieces = workPiecesOf(lot);
  const progress = offer.fromCard ? operationProgress(offer.operations, entries, lotPieces) : [];
  const [view, setView] = useState("operations");
  const [removing, setRemoving] = useState(null);
  const workers = workByWorker(entries);

  const handleRemove = async () => {
    if (await removeEntry(removing._id)) setRemoving(null);
  };

  return (
    <motion.div variants={itemVariants} className={CARD_CLASS} data-testid="lot-work-panel">
      <AnimatePresence>
        {removing && (
          <ConfirmDialog
            title="Remove work entry?"
            message={`${removing.workerName} · ${removing.operationName} · ${removing.pieces} pcs will be removed from wages.`}
            confirmLabel="Remove"
            onConfirm={handleRemove}
            onCancel={() => setRemoving(null)}
            confirmTestId="work-remove-confirm"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <HardHat size={18} className="text-primary" /> Work &amp; wages
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Labour on this invoice:{" "}
            <span className="font-semibold text-gray-800" data-testid="lot-work-amount" data-amount={totals.amount}>
              {formatMoney(totals.amount)}
            </span>
            {totals.perPiece > 0 ? ` · Rs ${totals.perPiece} per piece` : ""}
            {workers.length > 0 && (
              <span data-testid="lot-work-workers" data-count={workers.length}>
                {" "}
                · {workers.length} {plural(workers.length, "worker")}
              </span>
            )}
          </p>
        </div>
        {lot.hold ? (
          <Button
            icon={UserPlus}
            disabled
            className="w-full sm:w-auto"
            data-tip="Stopped — resume the invoice first"
            data-testid="lot-assign-work"
          >
            Assign work
          </Button>
        ) : (
          <Link href={`/lots/${lot._id}/work`} className="w-full sm:w-auto">
            <Button icon={UserPlus} className="w-full" data-testid="lot-assign-work">
              Assign work
            </Button>
          </Link>
        )}
      </div>

      {progress.length > 0 && (
        <div className="mb-4" data-testid="lot-work-progress">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">
            {offer.category} operations · pieces done out of {lotPieces}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {progress.map((op) => (
              <span
                key={op.operationId}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${chipClass(op)}`}
                data-testid="lot-work-op"
                data-operation={op.name}
                data-pieces={op.pieces}
                data-complete={op.complete}
              >
                {op.complete && <Check size={12} strokeWidth={3} />}
                {op.name} {op.pieces}/{lotPieces}
              </span>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader inline />
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500" data-testid="lot-work-empty">
          No work assigned yet. Open “Assign work” to give every operation to its workers in one go.
        </p>
      ) : (
        <div className="space-y-4">
          <SegmentedControl
            options={VIEWS}
            value={view}
            onChange={setView}
            ariaLabel="Show work by"
            className="w-full sm:w-fit"
            testId="lot-work-view"
          />
          {view === "operations" && <ByOperation entries={entries} onRemove={setRemoving} />}
          {view === "workers" && <ByWorker workers={workers} />}
          {view === "history" && <History entries={entries} />}
        </div>
      )}
    </motion.div>
  );
}

function ByOperation({ entries, onRemove }) {
  return groupByOperation(entries).map((group) => (
    <div key={group.operationName} data-testid="lot-work-group" data-operation={group.operationName}>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-semibold text-gray-800">{group.operationName}</span>
        <span className="text-gray-500">
          {group.pieces} pcs · <span className="font-semibold text-gray-800">{formatMoney(group.amount)}</span>
        </span>
      </div>
      <ul className={LIST_CLASS}>
        {group.entries.map((entry) => (
          <li
            key={entry._id}
            className="flex items-center gap-3 px-3 py-2 text-sm"
            data-testid="lot-work-entry"
            data-worker={entry.workerName}
          >
            <span className="flex-grow min-w-0">
              <span className="font-medium text-gray-800">{entry.workerName}</span>
              <span className="block text-xs text-gray-500">
                {formatDate(entry.date)} · {payLabel(entry)}
                {entry.note ? ` · ${entry.note}` : ""}
              </span>
            </span>
            <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(entry.amount)}</span>
            <button
              type="button"
              onClick={() => onRemove(entry)}
              data-tip="Remove"
              aria-label="Remove"
              className="text-gray-400 hover:text-danger cursor-pointer"
              data-testid="lot-work-remove"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  ));
}

function ByWorker({ workers }) {
  return (
    <ul className={LIST_CLASS} data-testid="lot-work-by-worker">
      {workers.map((row) => (
        <li
          key={row.workerId}
          className="flex items-center gap-3 px-3 py-2.5 text-sm"
          data-testid="lot-work-worker"
          data-worker={row.workerName}
          data-amount={row.amount}
        >
          <span className="flex-grow min-w-0">
            <span className="font-medium text-gray-800">{row.workerName}</span>
            <span className="block text-xs text-gray-500 [overflow-wrap:anywhere]">{workerWorkLine(row)}</span>
          </span>
          <span className="hidden sm:flex shrink-0 gap-1">
            {row.payTypes.map((type) => (
              <span
                key={type}
                className="whitespace-nowrap rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-gray-600"
              >
                {PAY_TYPE_LABELS[type]}
              </span>
            ))}
          </span>
          <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(row.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

function History({ entries }) {
  return (
    <ul className={LIST_CLASS} data-testid="lot-work-history">
      {workBatches(entries).map((batch) => (
        <li
          key={batch.key}
          className="flex items-center gap-3 px-3 py-2.5 text-sm"
          data-testid="lot-work-batch"
          data-workers={batch.workers}
        >
          <span className="flex-grow min-w-0">
            <span className="font-medium text-gray-800">{formatDateTime(batch.savedAt)}</span>
            <span className="block text-xs text-gray-500">
              {batch.workers} {plural(batch.workers, "worker")} · {batch.operations}{" "}
              {plural(batch.operations, "operation")}
              {batch.by ? ` · by ${batch.by}` : ""}
            </span>
          </span>
          <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(batch.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

export default WorkPanel;
