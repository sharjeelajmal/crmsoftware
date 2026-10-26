"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Banknote, CalendarCheck, Download, HardHat, Layers, Printer, Wallet } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { useWages } from "@/features/wages/hooks/useWages";
import { useWorkers } from "@/features/wages/hooks/useWorkers";
import { useAdvances } from "@/features/wages/hooks/useAdvances";
import { WagesToolbar } from "@/features/wages/components/WagesToolbar";
import { WagesTable } from "@/features/wages/components/WagesTable";
import { AdjustmentModal } from "@/features/wages/components/AdjustmentModal";
import { AdjustmentsCard } from "@/features/wages/components/AdjustmentsCard";
import { AdvancesCard } from "@/features/wages/components/AdvancesCard";
import { periodLabel, rangeLabel } from "@/features/wages/utils";

const ACTION_CLASS = "flex-1 sm:flex-none whitespace-nowrap";

export default function WagesPage() {
  const wages = useWages();
  const { workers } = useWorkers();
  const advances = useAdvances();
  // null = closed; {} = blank form; { type, workerId } = preset (e.g. "Cut" from the advance account)
  const [adding, setAdding] = useState(null);

  if (wages.isLoading) return <Loader />;

  const totals = wages.report?.totals ?? {};
  const label = periodLabel(wages.filter, wages.appliedRange);

  const handleAdd = async (form) => {
    if (await wages.addAdjustment(form)) {
      setAdding(null);
      advances.reload();
    }
  };

  const handleDelete = async (id) => {
    const deleted = await wages.deleteAdjustment(id);
    if (deleted) advances.reload();
    return deleted;
  };

  return (
    <>
      <AnimatePresence>
        {adding && (
          <AdjustmentModal
            workers={workers}
            balanceOf={advances.balanceOf}
            initial={adding}
            onSave={handleAdd}
            onCancel={() => setAdding(null)}
            isSaving={wages.isSaving}
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        data-testid="wages-page"
      >
        <motion.div variants={itemVariants} className="print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Wages</h1>
              <p className="text-gray-500 mt-1">
                {label} · {rangeLabel(wages.report?.from, wages.report?.to)} · pieces × operation rate per worker.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                icon={Wallet}
                className={ACTION_CLASS}
                onClick={() => setAdding({})}
                data-testid="wages-add-adjustment"
              >
                Advance / Deduction
              </Button>
              <Link href="/attendance" className="flex-1 sm:flex-none" data-testid="wages-attendance-link">
                <Button variant="secondary" icon={CalendarCheck} className="w-full whitespace-nowrap">
                  Attendance
                </Button>
              </Link>
              <Button
                variant="secondary"
                icon={Printer}
                className={ACTION_CLASS}
                onClick={() => window.print()}
                data-testid="wages-print"
              >
                Print
              </Button>
              <Button
                variant="secondary"
                icon={Download}
                className={ACTION_CLASS}
                onClick={wages.downloadCsv}
                disabled={wages.isDownloading || !wages.report}
                data-testid="wages-download"
              >
                {wages.isDownloading ? "Preparing…" : "Download CSV"}
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 print:hidden">
          <StatCard icon={HardHat} title="Workers paid" value={totals.workers ?? 0} />
          <StatCard icon={Layers} title="Pieces" value={totals.pieces ?? 0} />
          <StatCard icon={Banknote} title="Wages" value={formatMoney(totals.amount)} />
          <StatCard icon={Banknote} title="Net payable" value={formatMoney(totals.net)} />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="mb-5">
            <WagesToolbar
              filter={wages.filter}
              appliedRange={wages.appliedRange}
              onSelectPeriod={wages.selectPeriod}
              onApplyRange={wages.applyRange}
              workers={workers}
              workerId={wages.workerId}
              onWorker={wages.setWorkerId}
            />
          </div>
          {wages.isFetching && !wages.report ? <Loader inline /> : <WagesTable report={wages.report} label={label} />}
        </motion.div>

        <motion.div variants={itemVariants}>
          <AdvancesCard
            accounts={advances.accounts}
            totals={advances.totals}
            onCut={(account) => setAdding({ type: "recovery", workerId: account.workerId })}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <AdjustmentsCard adjustments={wages.report?.adjustments ?? []} onDelete={handleDelete} />
        </motion.div>
      </motion.div>
    </>
  );
}
