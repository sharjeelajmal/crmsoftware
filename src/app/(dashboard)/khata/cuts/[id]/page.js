"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { cutProgress, isPaid, payLabel } from "@/constants/wages";
import { formatDate, formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useOperations } from "@/features/wages/hooks/useOperations";
import { useWorkers } from "@/features/wages/hooks/useWorkers";
import { useCut, useKhataCuts } from "@/features/khata/hooks/useKhata";
import { KhataEntryForm } from "@/features/khata/components/KhataEntryForm";
import { CutFormPopup } from "@/features/khata/components/CutFormPopup";

const CARD_CLASS = "bg-white p-4 sm:p-6 rounded-2xl shadow-sm";

function Figure({ label, value, tone = "text-gray-800", testId }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm min-w-0" data-testid={testId} data-amount={value}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${tone}`}>{formatMoney(value)}</p>
    </div>
  );
}

/**
 * One cut of the stitching khata: how far each operation has got (pieces out of the cut's), who did it, what the
 * labour came to and what is still to pay; work can be added here for any worker.
 */
export default function CutPage() {
  const { id } = useParams();
  const router = useRouter();
  const cutApi = useCut(id);
  const cutsApi = useKhataCuts();
  const { operations } = useOperations();
  const { workers } = useWorkers();
  const [popup, setPopup] = useState(null); // "edit" | "delete"
  const cut = cutApi.cut;

  if (cutApi.isLoading && !cut) return <Loader />;
  if (!cut) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">Cut not found.</p>
        <Link href="/khata" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to the khata
        </Link>
      </div>
    );
  }

  const progress = cutProgress(cut, cut.entries);
  const handleSaveCut = async (form) => {
    const saved = await cutsApi.saveCut(form);
    if (saved) cutApi.reload();
    return saved;
  };
  const handleDelete = async () => {
    if (await cutsApi.deleteCut(cut)) router.push("/khata");
  };

  return (
    <>
      <AnimatePresence>
        {popup === "edit" && (
          <CutFormPopup cut={cut} onSave={handleSaveCut} onCancel={() => setPopup(null)} isSaving={cutsApi.isSaving} />
        )}
        {popup === "delete" && (
          <ConfirmDialog
            title={`Delete cut ${cut.cutNumber}?`}
            message="Only possible while no work is entered on it."
            confirmLabel="Delete"
            onConfirm={handleDelete}
            onCancel={() => setPopup(null)}
            confirmTestId="cut-delete-confirm"
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
        data-testid="khata-cut-page"
        data-cut={cut.cutNumber}
      >
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <Link href="/khata" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <ArrowLeft size={16} /> Stitching Khata
            </Link>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-800">Cut {cut.cutNumber}</h1>
            <p className="text-gray-500 mt-1">
              {cut.article ? `${cut.article} · ` : ""}
              {cut.pieces} pcs · {formatDate(cut.date)}
              {cut.note ? ` · ${cut.note}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Pencil} onClick={() => setPopup("edit")} data-testid="cut-edit">
              Edit
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setPopup("delete")}
              disabled={cut.entries.length > 0}
              data-tip={cut.entries.length > 0 ? "Work is entered on this cut" : undefined}
              data-testid="cut-delete"
            >
              Delete
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <Figure label="Total labour" value={progress.paid + progress.unpaid} testId="cut-labour" />
          <Figure label="Paid" value={progress.paid} tone="text-success" testId="cut-paid" />
          <Figure label="Remaining" value={progress.unpaid} tone="text-primary" testId="cut-remaining" />
        </motion.div>

        {progress.operations.length > 0 && (
          <motion.div variants={itemVariants} className={CARD_CLASS} data-testid="cut-progress">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Operations on this cut</h2>
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {progress.operations.map((op) => (
                <li
                  key={op.operationId}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                  data-testid="cut-operation"
                  data-operation={op.name}
                  data-pieces={op.pieces}
                >
                  <span className="flex-grow min-w-0">
                    <span className="font-medium text-gray-800">{op.name}</span>
                    <span className="block text-xs text-gray-500 [overflow-wrap:anywhere]">
                      {op.workers.join(", ")}
                    </span>
                  </span>
                  {progress.pieces > 0 && op.pieces > progress.pieces ? (
                    // entered before the limit was checked: shown so the extra pieces can be found
                    <span className="whitespace-nowrap font-semibold text-danger" data-testid="cut-operation-over">
                      <TriangleAlert size={12} strokeWidth={3} className="inline mr-1" />
                      {op.pieces} / {progress.pieces} pcs · {op.pieces - progress.pieces} too many
                    </span>
                  ) : (
                    <span
                      className={`whitespace-nowrap font-semibold ${op.complete ? "text-success" : "text-gray-800"}`}
                    >
                      {op.complete && <Check size={12} strokeWidth={3} className="inline mr-1" />}
                      {op.pieces}
                      {progress.pieces ? ` / ${progress.pieces}` : ""} pcs
                    </span>
                  )}
                  <span className="w-24 text-right whitespace-nowrap text-gray-700">{formatMoney(op.amount)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <KhataEntryForm
            cutValue={`cut:${cut._id}`}
            cuts={[cut]}
            workers={workers}
            operations={operations}
            onSave={cutApi.addEntry}
            isSaving={cutApi.isSaving}
          />
        </motion.div>

        <motion.div variants={itemVariants} className={CARD_CLASS}>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Work on this cut</h2>
          {cut.entries.length === 0 ? (
            <p className="text-sm text-gray-500">No work yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100" data-testid="cut-entries">
              {cut.entries.map((entry) => (
                <li key={entry._id} className="flex items-center gap-3 px-3 py-2 text-sm" data-testid="cut-entry">
                  <span className="flex-grow min-w-0">
                    <Link
                      href={`/khata/workers/${entry.workerId}`}
                      className="font-medium text-gray-800 hover:text-primary"
                    >
                      {entry.workerName}
                    </Link>
                    <span className="block text-xs text-gray-500">
                      {formatDate(entry.date)} · {entry.operationName} · {payLabel(entry)}
                    </span>
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      isPaid(entry) ? "bg-success-soft text-success" : "bg-surface-muted text-gray-500"
                    }`}
                  >
                    {isPaid(entry) ? "Paid" : "Unpaid"}
                  </span>
                  <span className="font-semibold text-gray-800 whitespace-nowrap">{formatMoney(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
