"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, Lock, Printer, Scale } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { baqayaAndAdvance, baqayaLabel, isPaid, overallBalance } from "@/constants/wages";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { useOperations } from "@/features/wages/hooks/useOperations";
import { useCutChoices, useWorkerKhata } from "@/features/khata/hooks/useKhata";
import { KhataEntryForm } from "@/features/khata/components/KhataEntryForm";
import { KhataLedger } from "@/features/khata/components/KhataLedger";
import { LockModal } from "@/features/khata/components/LockModal";
import { KhataPrintModal } from "@/features/khata/components/KhataPrintModal";
import { BaqayaCard } from "@/features/khata/components/BaqayaCard";
import { BalanceFormPopup } from "@/features/khata/components/BalanceFormPopup";

const FIGURE_CLASS = "rounded-2xl bg-white p-4 shadow-sm min-w-0";

function Figure({ label, value, text, tone = "text-gray-800", testId }) {
  return (
    <div className={FIGURE_CLASS} data-testid={testId} data-amount={value}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${tone}`}>{text ?? formatMoney(value)}</p>
    </div>
  );
}

/** The last day of the unpaid work (today at least) — "Pay all" locks up to it, so nothing is left out. */
const lastWorkDay = (entries) =>
  format(
    entries.reduce((day, entry) => (new Date(entry.date) > day ? new Date(entry.date) : day), new Date()),
    "yyyy-MM-dd"
  );

/**
 * One worker's stitching khata: add the evening's work, see what is not paid yet grow with it, and lock it when he
 * is paid ("paid up to here") — with the cash actually given; less or more stays as his baqaya (client, 2026-11-22),
 * beside old balances from the notebook. One line says who owes whom overall.
 */
export default function WorkerKhataPage() {
  const { id } = useParams();
  const khataApi = useWorkerKhata(id);
  const { operations } = useOperations();
  const choices = useCutChoices();
  const [paying, setPaying] = useState(null); // null | { upTo, title }
  const [popup, setPopup] = useState(null); // "print" | "balance"
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

  const { worker, entries, payments, totals, advanceLeft, balances = [], advances = [], baqaya = 0 } = khata;
  const overall = overallBalance({ toPay: totals.unpaid, baqaya, advanceLeft });
  // shown apart (client, 2026-11-23): what he is still owed, and what he has to give back
  const split = baqayaAndAdvance({ baqaya, advanceLeft });
  const togglePaid = (entry) => (isPaid(entry) ? khataApi.unpayEntry(entry) : khataApi.payEntry(entry));
  // "Pay all" (client, 2026-11-21): the same lock over every unpaid line, with the cash given
  const payAll = (section) => setPaying({ upTo: lastWorkDay(section.entries), title: `Pay all · ${worker.name}` });

  return (
    <>
      <AnimatePresence>
        {popup === "print" && (
          <KhataPrintModal
            worker={worker}
            entries={entries}
            advanceLeft={advanceLeft}
            baqaya={baqaya}
            onClose={() => setPopup(null)}
          />
        )}
        {popup === "balance" && (
          <BalanceFormPopup
            workerName={worker.name}
            onSave={khataApi.addBalance}
            onCancel={() => setPopup(null)}
            isSaving={khataApi.isSaving}
          />
        )}
        {paying && (
          <LockModal
            workerName={worker.name}
            title={paying.title}
            initialUpTo={paying.upTo}
            entries={entries}
            advanceLeft={advanceLeft}
            baqaya={baqaya}
            onLock={khataApi.lock}
            onCancel={() => setPaying(null)}
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => setPopup("print")}
              disabled={entries.length === 0 && baqaya === 0}
              className="w-full sm:w-auto"
              data-testid="khata-print"
            >
              Print
            </Button>
            <Button
              icon={Lock}
              onClick={() => setPaying({ upTo: "", title: "" })}
              disabled={totals.unpaid <= 0}
              data-tip={totals.unpaid <= 0 ? "Nothing to pay" : undefined}
              className="w-full sm:w-auto"
              data-testid="khata-lock"
            >
              Lock · paid up to…
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Figure label="To pay (work)" value={totals.unpaid} tone="text-primary" testId="khata-to-pay" />
          <Figure label="Paid (all)" value={totals.paid} tone="text-success" testId="khata-paid" />
          <Figure
            label="Baqaya · you give him"
            value={split.baqaya}
            tone={split.baqaya > 0 ? "text-primary" : "text-gray-800"}
            testId="khata-baqaya-figure"
          />
          <Figure
            label="Advance · he gives back"
            value={split.advance}
            tone={split.advance > 0 ? "text-amber-700" : "text-gray-800"}
            testId="khata-advance"
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-semibold ${
            overall > 0
              ? "bg-primary-soft text-primary"
              : overall < 0
                ? "bg-warning-soft text-amber-800"
                : "bg-success-soft text-success"
          }`}
          data-testid="khata-overall"
          data-amount={overall}
        >
          <Scale size={18} className="shrink-0" />
          <span>
            Overall: {overall === 0 ? "nothing is owed either way" : baqayaLabel(overall)}
            <span className="block text-xs font-normal opacity-80">
              Work to pay {formatMoney(totals.unpaid)}
              {split.baqaya ? ` · baqaya + ${formatMoney(split.baqaya)}` : ""}
              {split.advance ? ` · advance − ${formatMoney(split.advance)}` : ""}
            </span>
          </span>
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
            onPayAll={payAll}
            onRemove={khataApi.removeEntry}
            onRemovePayment={khataApi.removePayment}
            isSaving={khataApi.isSaving}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <BaqayaCard
            baqaya={split.baqaya}
            advance={split.advance}
            balances={balances}
            payments={payments}
            advances={advances}
            onAdd={() => setPopup("balance")}
            onRemove={khataApi.removeBalance}
            isSaving={khataApi.isSaving}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
