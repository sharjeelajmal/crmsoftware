"use client";

import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Download, Package, Plus, Printer, Scissors, Scroll } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useLedger } from "@/features/ledger/hooks/useLedger";
import { useLedgerShortcut } from "@/features/ledger/hooks/useLedgerShortcut";
import { LedgerToolbar } from "@/features/ledger/components/LedgerToolbar";
import { LedgerTable } from "@/features/ledger/components/LedgerTable";
import { LedgerEntryForm } from "@/features/ledger/components/LedgerEntryForm";
import { LedgerHistoryModal } from "@/features/ledger/components/LedgerHistoryModal";
import { LEDGER_PERIODS } from "@/features/ledger/utils";

const CLOSED = { type: null, data: null };
const ACTION_CLASS = "flex-1 sm:flex-none whitespace-nowrap";

// useSearchParams (lot shortcut) needs a Suspense boundary so the page can still be prerendered.
export default function LedgerPage() {
  return (
    <Suspense fallback={<Loader />}>
      <LedgerRegister />
    </Suspense>
  );
}

function LedgerRegister() {
  const ledger = useLedger();
  const { draft, isResolving, clearDraft } = useLedgerShortcut();
  const [popup, setPopup] = useState(CLOSED);
  const [isSaving, setIsSaving] = useState(false);

  // The lot shortcut opens the form prefilled with that lot's shortfall.
  useEffect(() => {
    if (draft) {
      setPopup({ type: "form", data: draft });
      clearDraft();
    }
  }, [draft, clearDraft]);

  const closePopup = () => setPopup(CLOSED);

  const handleSave = async (form) => {
    setIsSaving(true);
    const saved = await ledger.saveEntry(form);
    setIsSaving(false);
    if (saved) closePopup();
  };

  const handleDelete = async () => {
    if (await ledger.deleteEntry(popup.data)) closePopup();
  };

  if (ledger.isLoading || isResolving) return <Loader />;

  const { byType, count } = ledger.totals;
  const periodLabel =
    ledger.filter === "custom" ? "Custom range" : LEDGER_PERIODS.find((p) => p.value === ledger.filter)?.label || "";

  return (
    <>
      <AnimatePresence>
        {popup.type === "form" && (
          <LedgerEntryForm initialData={popup.data} onSave={handleSave} onCancel={closePopup} isSaving={isSaving} />
        )}
        {popup.type === "history" && <LedgerHistoryModal entry={popup.data} onClose={closePopup} />}
        {popup.type === "delete" && (
          <ConfirmDialog
            title="Delete entry?"
            message="This register entry will be removed. Stock is not affected either way."
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={closePopup}
            confirmTestId="ledger-delete-confirm"
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        data-testid="ledger-page"
      >
        <motion.div variants={itemVariants} className="print:hidden">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Loose Items & B-Pair</h1>
          <p className="text-gray-500 mt-1">
            Manual register for B-pair pieces, accessories and leftover fabric. Separate from stock.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 print:hidden">
          <StatCard icon={Scissors} title="B-Pair pieces" value={byType.bpair.qty} />
          <StatCard icon={Package} title="Accessories" value={byType.accessory.qty} />
          <StatCard icon={Scroll} title="Fabric" value={byType.fabric.qty} />
          <StatCard icon={BookOpen} title="Entries" value={count} />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end print:hidden"
        >
          <Button
            variant="secondary"
            icon={Printer}
            className={ACTION_CLASS}
            onClick={() => window.print()}
            data-testid="ledger-print"
          >
            Print
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            className={ACTION_CLASS}
            onClick={ledger.downloadCsv}
            disabled={ledger.isDownloading}
            data-testid="ledger-download"
          >
            {ledger.isDownloading ? "Preparing…" : "Download CSV"}
          </Button>
          <Button
            icon={Plus}
            className={ACTION_CLASS}
            onClick={() => setPopup({ type: "form", data: null })}
            data-testid="ledger-add"
          >
            New Entry
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="mb-5">
            <LedgerToolbar
              search={ledger.search}
              onSearch={ledger.setSearch}
              type={ledger.type}
              onType={ledger.setType}
              filter={ledger.filter}
              appliedRange={ledger.appliedRange}
              onSelectPeriod={ledger.selectPeriod}
              onApplyRange={ledger.applyRange}
            />
          </div>
          <LedgerTable
            entries={ledger.entries}
            isLoading={ledger.isFetching && ledger.entries.length === 0}
            type={ledger.type}
            periodLabel={periodLabel}
            onEdit={(entry) => setPopup({ type: "form", data: entry })}
            onDelete={(entryId) => setPopup({ type: "delete", data: entryId })}
            onHistory={(entry) => setPopup({ type: "history", data: entry })}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
