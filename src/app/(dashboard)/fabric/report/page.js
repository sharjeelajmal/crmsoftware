"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { addDays } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { dateToValue, valueToDate } from "@/constants/datePresets";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { useCuttingReport } from "@/features/fabric/hooks/useCuttingReport";
import { CuttingReportView } from "@/features/fabric/components/CuttingReportView";
import { todayValue } from "@/features/fabric/utils";

const STEP_CLASS =
  "grid place-items-center w-12 shrink-0 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-primary " +
  "hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

// useSearchParams (?day= from the khata's day links) needs a Suspense boundary so the page can still be prerendered.
export default function CuttingReportPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CuttingReport />
    </Suspense>
  );
}

function CuttingReport() {
  const searchParams = useSearchParams();
  const initialDay = valueToDate(searchParams.get("day")) ? searchParams.get("day") : "";
  const { report, day, setDay, holderId, setHolderId, isLoading, isFetching } = useCuttingReport(initialDay);
  const isToday = day >= todayValue();
  const step = (days) => setDay(dateToValue(addDays(valueToDate(day), days)));

  if (isLoading || !report) return <Loader />;

  const holderOptions = [
    { value: "", label: "All cutting masters" },
    ...(report.holders ?? []).map((h) => ({ value: h.id, label: h.name })),
  ];
  const holderName = (report.holders ?? []).find((h) => h.id === holderId)?.name ?? "";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="@container space-y-6 max-w-7xl mx-auto"
      data-testid="cutting-report-page"
    >
      <motion.div variants={itemVariants} className="print:hidden">
        <Link href="/fabric" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3">
          <ArrowLeft size={16} /> Fabric Khata
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Daily Cutting Report</h1>
        <p className="text-gray-500 mt-1">
          What was cut on the day, the fabric used and received, what is in hand, and the remarks.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col @3xl:flex-row @3xl:items-stretch gap-3 print:hidden">
        <div className="flex gap-2 @3xl:w-96">
          <button
            type="button"
            className={STEP_CLASS}
            onClick={() => step(-1)}
            aria-label="Previous day"
            data-tip="Previous day"
            data-testid="report-prev-day"
          >
            <ChevronLeft size={20} />
          </button>
          <DatePickerField
            id="cutting-report-day"
            value={day}
            onChange={(value) => value && setDay(value)}
            className="flex-1 min-w-0"
            testId="report-day"
          />
          <button
            type="button"
            className={STEP_CLASS}
            onClick={() => step(1)}
            disabled={isToday}
            aria-label="Next day"
            data-tip="Next day"
            data-testid="report-next-day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {report.admin && (
          <div className="@3xl:w-64" data-testid="report-holder-filter">
            <SelectDropdown
              options={holderOptions}
              selected={holderId}
              onSelect={setHolderId}
              ariaLabel="Cutting master"
            />
          </div>
        )}
        <Button
          variant="secondary"
          icon={Printer}
          className="@3xl:ml-auto whitespace-nowrap"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <CuttingReportView report={report} holderName={holderName} isFetching={isFetching} />
      </motion.div>
    </motion.div>
  );
}
