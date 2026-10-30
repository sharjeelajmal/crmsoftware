"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Droplets, Layers, Scissors, Shirt } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { plural } from "@/constants/dashboard";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { useLotReport } from "@/features/lots/hooks/useLotReport";
import { LotReportFilter } from "@/features/lots/components/LotReportFilter";
import { LotReportStageTable } from "@/features/lots/components/LotReportStageTable";
import { LotReportTable } from "@/features/lots/components/LotReportTable";

export default function LotReportPage() {
  const { report, isLoading, isFetching, filter, appliedRange, selectPeriod, applyRange, downloadCsv, isDownloading } =
    useLotReport();

  if (isLoading) return <Loader />;

  const totals = report?.totals ?? {};
  const rows = report?.lots ?? [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      data-testid="lot-report-page"
    >
      <motion.div variants={itemVariants}>
        <Link href="/lots" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3">
          <ArrowLeft size={16} /> Invoices
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Invoice Report</h1>
            <p className="text-gray-500 mt-1">
              Pieces cut, stitched and washed per invoice, with the shortfall at each step.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
            <LotReportFilter
              filter={filter}
              appliedRange={appliedRange}
              onSelectPeriod={selectPeriod}
              onApplyRange={applyRange}
            />
            <Button
              icon={Download}
              onClick={downloadCsv}
              disabled={isDownloading || !report}
              className="w-full sm:w-auto"
              data-testid="lot-report-download"
            >
              {isDownloading ? "Preparing…" : "Download CSV"}
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={Layers} title="Invoices" value={totals.count ?? 0} />
        <StatCard icon={Scissors} title="Cut" value={totals.cutQty ?? 0} />
        <StatCard icon={Shirt} title="Stitched" value={totals.stitchedQty ?? 0} />
        <StatCard icon={Droplets} title="Washed" value={totals.washedQty ?? 0} />
      </motion.div>

      <LotReportStageTable byStage={report?.byStage} />

      <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Invoices</h2>
          <span className="text-sm text-gray-500">
            {rows.length} {plural(rows.length, "invoice")}
          </span>
        </div>
        {isFetching && !report ? <Loader inline /> : <LotReportTable rows={rows} />}
      </motion.div>
    </motion.div>
  );
}
