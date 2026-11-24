"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useOperations } from "@/features/wages/hooks/useOperations";
import { useArticleCosts, useKhataCuts, useKhataWorkers } from "@/features/khata/hooks/useKhata";
import { ArticleCostsCard } from "@/features/khata/components/ArticleCostsCard";
import { WorkerBox } from "@/features/khata/components/WorkerBox";
import { CutsList } from "@/features/khata/components/CutsList";
import { CutFormPopup } from "@/features/khata/components/CutFormPopup";

const VIEWS = [
  { value: "workers", label: "Workers" },
  { value: "cuts", label: "Cuts" },
];
const SEARCH_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";

/**
 * Stitching khata (client, 2026-11-19): the owner keeps it by hand. Each worker's box shows his usual operations with
 * their rate and what is not paid yet; his khata takes the evening's work and the lock ("paid up to here"). The cuts
 * are added here as they come from cutting.
 */
export default function KhataPage() {
  const [view, setView] = useState("workers");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const workersApi = useKhataWorkers();
  const cutsApi = useKhataCuts();
  const articleCosts = useArticleCosts();
  const { operations } = useOperations();

  if (workersApi.isLoading && workersApi.workers.length === 0) return <Loader />;

  const needle = search.trim().toLowerCase();
  const workers = workersApi.workers.filter((w) => !needle || w.name.toLowerCase().includes(needle));
  const cuts = cutsApi.cuts.filter((c) => !needle || `${c.cutNumber} ${c.article}`.toLowerCase().includes(needle));
  const isCuts = view === "cuts";

  return (
    <>
      <AnimatePresence>
        {adding && (
          <CutFormPopup onSave={cutsApi.saveCut} onCancel={() => setAdding(false)} isSaving={cutsApi.isSaving} />
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 max-w-7xl mx-auto"
        data-testid="khata-page"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Stitching Khata</h1>
          <p className="text-gray-500 mt-1">
            Each worker&apos;s work by cut, entered by hand, with his payment adding up as you go. Lock a khata when he
            is paid; new work starts after it.
          </p>
        </motion.div>

        <ArticleCostsCard articles={articleCosts.articles} isLoading={articleCosts.isLoading} />

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <SegmentedControl
              options={VIEWS}
              value={view}
              onChange={setView}
              ariaLabel="Show"
              className="w-full md:w-fit"
              testId="khata-view"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  autoComplete="off"
                  type="text"
                  placeholder={isCuts ? "Search cuts…" : "Search workers…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={SEARCH_CLASS}
                />
              </div>
              {isCuts && (
                <Button
                  icon={Plus}
                  onClick={() => setAdding(true)}
                  className="whitespace-nowrap"
                  data-testid="khata-add-cut"
                >
                  Add cut
                </Button>
              )}
            </div>
          </div>

          {isCuts ? (
            cutsApi.isLoading && cutsApi.cuts.length === 0 ? (
              <Loader inline />
            ) : (
              <CutsList cuts={cuts} />
            )
          ) : workers.length === 0 ? (
            <p className="text-center text-gray-500 py-10" data-testid="khata-workers-empty">
              No workers yet. Add them on the Workers page with the operations they do.
            </p>
          ) : (
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {workers.map((worker) => (
                <WorkerBox key={worker._id} worker={worker} operations={operations} />
              ))}
            </motion.ul>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
