"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { isPaid } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { useOperations } from "@/features/wages/hooks/useOperations";
import { useCutChoices, useWorkerKhata } from "@/features/khata/hooks/useKhata";
import { KhataEntryForm } from "@/features/khata/components/KhataEntryForm";
import { KhataLedger } from "@/features/khata/components/KhataLedger";
import { LockModal } from "@/features/khata/components/LockModal";

const FIGURE_CLASS = "rounded-2xl bg-white p-4 shadow-sm min-w-0";

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className={FIGURE_CLASS} data-testid={testId} data-amount={value}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${tone}`}>{formatMoney(value)}</p>
    </div>
  );
}

/**
 * One worker's stitching khata: add the evening's work, see what is not paid yet grow with it, and lock it when he
 * is paid ("paid up to here").
 */
export default function WorkerKhataPage() {
  const { id } = useParams();
  const khataApi = useWorkerKhata(id);
  const { operations } = useOperations();
  const choices = useCutChoices();
  const [locking, setLocking] = useState(false);
  const khata = khataApi.khata;

  if (khataApi.isLoading && !khata) return <Loader />;
  if (!khata) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">Worker not found.</p>
        <Link href="/khata" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to the khata
        </Link>
      </div>
    );
  }

  const { worker, entries, payments, totals, advanceLeft } = khata;
  const togglePaid = (entry) => (isPaid(entry) ? khataApi.unpayEntry(entry) : khataApi.payEntry(entry));

  return (
    <>
      <AnimatePresence>
        {locking && (
          <LockModal
            workerName={worker.name}
            entries={entries}
            advanceLeft={advanceLeft}
            onLock={khataApi.lock}
            onCancel={() => setLocking(false)}
            isSaving={khataApi.isSaving}
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
        data-testid="worker-khata-page"
        data-worker={worker.name}
      >
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <Link href="/khata" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ArrowLeft size={16} /> Stitching Khata
            </Link>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-800 [overflow-wrap:anywhere]">
              {worker.name}
            </h1>
            <p className="text-gray-500 mt-1">
              {worker.active === false ? "Inactive · " : ""}
              {worker.phone ? `${worker.phone} · ` : ""}
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <Button
            icon={Lock}
            onClick={() => setLocking(true)}
            disabled={totals.unpaid <= 0}
            data-tip={totals.unpaid <= 0 ? "Nothing to pay" : undefined}
            className="w-full sm:w-auto"
            data-testid="khata-lock"
          >
            Lock · paid up to…
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Figure label="To pay" value={totals.unpaid} tone="text-primary" testId="khata-to-pay" />
          <Figure label="Paid (all)" value={totals.paid} tone="text-success" testId="khata-paid" />
          <Figure label="Advance left" value={advanceLeft} testId="khata-advance" />
        </motion.div>

        {worker.active !== false && (
          <motion.div variants={itemVariants}>
            <KhataEntryForm
              worker={worker}
              cuts={choices.cuts}
              lots={choices.lots}
              operations={operations}
              onSave={khataApi.addEntry}
              isSaving={khataApi.isSaving}
            />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <KhataLedger
            entries={entries}
            payments={payments}
            onTogglePaid={togglePaid}
            onRemove={khataApi.removeEntry}
            onRemovePayment={khataApi.removePayment}
            isSaving={khataApi.isSaving}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
