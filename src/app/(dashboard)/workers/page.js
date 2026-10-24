"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HardHat, ListChecks, Plus, Scissors, Search, Users } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useWorkers } from "@/features/wages/hooks/useWorkers";
import { useOperations } from "@/features/wages/hooks/useOperations";
import { WorkerFormPopup } from "@/features/wages/components/WorkerFormPopup";
import { WorkerRow } from "@/features/wages/components/WorkerRow";
import { OperationFormPopup } from "@/features/wages/components/OperationFormPopup";
import { OperationRow } from "@/features/wages/components/OperationRow";

const VIEWS = { WORKERS: "workers", OPERATIONS: "operations" };
const CLOSED = { type: null, data: null };
const SEARCH_CLASS =
  "pl-12 w-full py-3 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary";
const tabClass = (active) =>
  "px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer " +
  (active ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-100");

export default function WorkersPage() {
  const workersApi = useWorkers();
  const operationsApi = useOperations();
  const [view, setView] = useState(VIEWS.WORKERS);
  const [search, setSearch] = useState("");
  const [popup, setPopup] = useState(CLOSED);

  const closePopup = () => setPopup(CLOSED);
  const withClose = async (promise) => {
    if (await promise) closePopup();
  };

  if (workersApi.isLoading || operationsApi.isLoading) return <Loader />;

  const isWorkers = view === VIEWS.WORKERS;
  const activeWorkers = workersApi.workers.filter((w) => w.active !== false).length;
  const needle = search.trim().toLowerCase();
  const workers = workersApi.workers.filter((w) => !needle || w.name.toLowerCase().includes(needle));
  const operations = operationsApi.operations.filter((op) => !needle || op.name.toLowerCase().includes(needle));

  return (
    <>
      <AnimatePresence>
        {popup.type === "worker" && (
          <WorkerFormPopup
            initialData={popup.data}
            onSave={(form) => withClose(workersApi.saveWorker(form))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "operation" && (
          <OperationFormPopup
            initialData={popup.data}
            onSave={(form) => withClose(operationsApi.saveOperation(form))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "deleteWorker" && (
          <ConfirmDialog
            title={`Delete ${popup.data.name}?`}
            message="Only possible while the worker has no work entries. Otherwise deactivate instead."
            confirmLabel="Delete"
            onConfirm={() => withClose(workersApi.deleteWorker(popup.data._id))}
            onCancel={closePopup}
            confirmTestId="worker-delete-confirm"
          />
        )}
        {popup.type === "deleteOperation" && (
          <ConfirmDialog
            title={`Delete ${popup.data.name}?`}
            message="Only possible while no work entry uses this operation. Otherwise deactivate instead."
            confirmLabel="Delete"
            onConfirm={() => withClose(operationsApi.deleteOperation(popup.data._id))}
            onCancel={closePopup}
            confirmTestId="operation-delete-confirm"
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
        data-testid="workers-page"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Workers &amp; Rates</h1>
          <p className="text-gray-500 mt-1">
            Stitching workers and the per-piece rate of every operation. Wages are calculated from these rates.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard icon={Users} title="Active Workers" value={activeWorkers} />
          <StatCard icon={ListChecks} title="Operations" value={operationsApi.operations.length} />
          <StatCard icon={Scissors} title="Labour per piece" value={`Rs ${operationsApi.perPiece}`} />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setView(VIEWS.WORKERS)}
                className={`${tabClass(isWorkers)} flex-1 sm:flex-none`}
                data-testid="workers-tab-workers"
              >
                Workers
              </button>
              <button
                type="button"
                onClick={() => setView(VIEWS.OPERATIONS)}
                className={`${tabClass(!isWorkers)} flex-1 sm:flex-none`}
                data-testid="workers-tab-operations"
              >
                Operations &amp; rates
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={isWorkers ? "Search workers…" : "Search operations…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={SEARCH_CLASS}
                />
              </div>
              <Button
                icon={isWorkers ? HardHat : Plus}
                onClick={() => setPopup({ type: isWorkers ? "worker" : "operation", data: null })}
                className="w-full sm:w-auto whitespace-nowrap"
                data-testid={isWorkers ? "workers-add" : "operations-add"}
              >
                {isWorkers ? "Add Worker" : "Add Operation"}
              </Button>
            </div>
          </div>

          <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
            <span className="flex-grow">{isWorkers ? "Worker" : "Operation"}</span>
            <span className={isWorkers ? "w-32 text-center" : "w-40 text-center"}>{isWorkers ? "Status" : "Rate"}</span>
            <span className="w-40 text-center">Actions</span>
          </div>

          <div className="space-y-3 mt-4">
            {isWorkers ? (
              workers.length > 0 ? (
                workers.map((worker) => (
                  <WorkerRow
                    key={worker._id}
                    worker={worker}
                    onEdit={(w) => setPopup({ type: "worker", data: w })}
                    onToggleActive={workersApi.setActive}
                    onDelete={(w) => setPopup({ type: "deleteWorker", data: w })}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">No workers yet. Add the stitching workers first.</p>
              )
            ) : operations.length > 0 ? (
              operations.map((operation, index) => (
                <OperationRow
                  key={operation._id}
                  operation={operation}
                  index={index}
                  onEdit={(op) => setPopup({ type: "operation", data: op })}
                  onToggleActive={operationsApi.setActive}
                  onDelete={(op) => setPopup({ type: "deleteOperation", data: op })}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-10">
                No operations yet. Add each stitching operation with its rate per piece (e.g. Belt · Rs 3.5).
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
