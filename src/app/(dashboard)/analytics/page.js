"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { InvoicePreview } from "@/components/invoice/InvoicePreview";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { errorMessage } from "@/lib/api-client";
import { containerVariants, itemVariants } from "@/constants/animations";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { AnalyticsStats } from "@/features/analytics/components/AnalyticsStats";
import { PeriodFilter } from "@/features/analytics/components/PeriodFilter";
import { SalesChart } from "@/features/analytics/components/SalesChart";
import { ProfitChart } from "@/features/analytics/components/ProfitChart";
import { TopProducts } from "@/features/analytics/components/TopProducts";
import { RecentSales } from "@/features/analytics/components/RecentSales";

export default function AnalyticsPage() {
  const toast = useToast();
  const { data, isLoading, filter, appliedRange, selectPeriod, applyRange } = useAnalytics();
  const { downloadInvoicePdf } = useInvoicePdf();
  const [invoice, setInvoice] = useState(null);

  const handleSavePdf = async (sale) => {
    try {
      await downloadInvoicePdf(sale);
    } catch (err) {
      toast.error(errorMessage(err, "Could not generate the PDF."));
    }
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {invoice && (
          <Modal onClose={() => setInvoice(null)} size="xl" padded={false}>
            <InvoicePreview sale={invoice} />
          </Modal>
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 sm:space-y-8">
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Analytics</h1>
          <PeriodFilter
            filter={filter}
            appliedRange={appliedRange}
            onSelectPeriod={selectPeriod}
            onApplyRange={applyRange}
          />
        </motion.div>

        <AnimatePresence>
          {!data && (
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col items-center text-center text-gray-500 py-10 bg-white rounded-2xl shadow-lg"
            >
              <AlertTriangle size={48} className="text-red-400 mb-4" />
              <h3 className="text-xl font-bold">Data could not be loaded.</h3>
              <p>
                {filter === "custom"
                  ? "Please select a valid custom date range and click 'Apply Range'."
                  : "Please check your API connection or try again later."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {data && (
          <motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <AnalyticsStats data={data} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
              <SalesChart label={data.chartLabel} chartData={data.chartData} />
              <ProfitChart filter={filter} totalProfit={data.totalProfit} chartData={data.chartData} />
            </div>
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mt-4 sm:mt-8"
            >
              <TopProducts filter={filter} products={data.topSellingProducts ?? []} />
              <RecentSales sales={data.recentSales ?? []} onViewInvoice={setInvoice} onSavePdf={handleSavePdf} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
