"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, Loader2, PackageCheck, Plus, Search } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { FilterButton } from "@/components/ui/FilterButton";
import { useMyLots } from "@/features/cutting/hooks/useMyLots";
import { LotCard } from "@/features/cutting/components/LotCard";
import { STAGE_FILTERS, filterLots, lotStats } from "@/features/cutting/utils";

const SEARCH_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

export default function CuttingPage() {
  const { lots, isLoading } = useMyLots();
  const [searchTerm, setSearchTerm] = useState("");
  const [stage, setStage] = useState("");

  const stats = lotStats(lots);
  const visible = filterLots(lots, { searchTerm, stage });

  if (isLoading) return <Loader />;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">My Lots</h1>
          <p className="text-gray-500 mt-1">Cutting entries you have recorded and where they are in production.</p>
        </div>
        <Link href="/cutting/new" className="w-full sm:w-auto" data-testid="cutting-new">
          <Button icon={Plus} size="lg" className="w-full">
            New Cutting Entry
          </Button>
        </Link>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard icon={Layers} title="My lots" value={stats.total} />
        <StatCard icon={Loader2} title="In process" value={stats.inProcess} />
        <StatCard icon={PackageCheck} title="Ready" value={stats.ready} />
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-5">
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 sm:gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto">
            {STAGE_FILTERS.map(({ value, label }) => (
              <FilterButton
                key={value || "all"}
                label={label}
                active={stage === value}
                onClick={() => setStage(value)}
              />
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search lot number or article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="cutting-search"
              className={SEARCH_CLASS}
            />
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
          {visible.length > 0 ? (
            visible.map((lot) => <LotCard key={lot._id} lot={lot} href={`/cutting/${lot._id}`} />)
          ) : (
            <p className="text-center text-gray-500 py-10">
              {lots.length === 0
                ? "No cutting entries yet. Start with a new cutting entry."
                : "No lots match this filter."}
            </p>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
