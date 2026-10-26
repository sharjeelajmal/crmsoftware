"use client";

import { use, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileBarChart, Layers, Loader2, PackageCheck, Scissors, Search } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { FilterButton } from "@/components/ui/FilterButton";
import { useLots } from "@/features/lots/hooks/useLots";
import { LotsTable } from "@/features/lots/components/LotsTable";
import { STAGES, STAGE_FILTERS, filterLots } from "@/features/cutting/utils";

const SEARCH_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

/** `/lots?stage=stitching` opens the list on that stage (links from the dashboard pipeline). */
const stageFromParams = (params) => (STAGES.includes(params?.stage) ? params.stage : "");

export default function LotsPage({ searchParams }) {
  const params = use(searchParams);
  const [stage, setStage] = useState(() => stageFromParams(params));
  const [searchTerm, setSearchTerm] = useState("");

  // Keep the address in step with the filter, so a refresh or a shared link opens the same stage.
  const chooseStage = (value) => {
    setStage(value);
    window.history.replaceState(null, "", value ? `?stage=${value}` : window.location.pathname);
  };
  const { lots, summary, isLoading, isFetching } = useLots(stage);

  const visible = filterLots(lots, { searchTerm });

  if (isLoading) return <Loader />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Production Lots</h1>
          <p className="text-gray-500 mt-1">Every cutting lot and where it is in the pipeline.</p>
        </div>
        <Link href="/lots/report" className="w-full sm:w-auto" data-testid="lots-report-link">
          <Button variant="secondary" icon={FileBarChart} className="w-full">
            Report
          </Button>
        </Link>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard icon={Scissors} title="New lots" value={summary?.newLots ?? 0} />
        <StatCard icon={Loader2} title="In process" value={summary?.inProcess ?? 0} />
        <StatCard icon={PackageCheck} title="Ready" value={summary?.ready ?? 0} />
        <StatCard icon={Layers} title="Today's pieces" value={summary?.today?.pieces ?? 0} />
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-5">
          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 sm:flex sm:flex-wrap gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto">
            {STAGE_FILTERS.map(({ value, label, short }) => (
              <FilterButton
                key={value || "all"}
                label={
                  <>
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </>
                }
                data-tip={label}
                wrap
                active={stage === value}
                aria-pressed={stage === value}
                data-testid={`lots-filter-${value || "all"}`}
                onClick={() => chooseStage(value)}
              />
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              autoComplete="off"
              type="text"
              placeholder="Search lot, article or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="lots-search"
              className={SEARCH_CLASS}
            />
          </div>
        </div>

        {isFetching && lots.length === 0 ? (
          <Loader inline />
        ) : (
          <LotsTable
            lots={visible}
            emptyMessage={lots.length === 0 ? "No lots at this stage yet." : "No lots match your search."}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
