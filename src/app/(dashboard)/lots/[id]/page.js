"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, PauseCircle } from "lucide-react";
import { itemVariants } from "@/constants/animations";
import { errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { Loader } from "@/components/ui/Loader";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";
import { LotDetail } from "@/features/cutting/components/LotDetail";
import { LotActions } from "@/features/lots/components/LotActions";
import { StageActionPanel } from "@/features/lots/components/StageActionPanel";
import { ShortfallPanel } from "@/features/lots/components/ShortfallPanel";
import { WorkPanel } from "@/features/wages/components/WorkPanel";
import { DispatchOutPanel } from "@/features/lots/components/DispatchOutPanel";

export default function AdminLotPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lot, isLoading, error, reload } = useLotDetail(id);

  if (isLoading) return <Loader />;

  if (!lot) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">{error ? errorMessage(error, "Invoice not found") : "Invoice not found."}</p>
        <Link href="/lots" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
      </div>
    );
  }

  // Stage moves, reverse, stop and resume answer with the updated lot; the cached copy is stale, so refetch.
  const handleStageUpdated = () => {
    clearAsyncDataCache(`lot:${lot._id}`);
    reload();
  };

  return (
    <LotDetail
      lot={lot}
      backHref="/lots"
      backLabel="Invoices"
      editHref={`/cutting/${lot._id}/edit`}
      canIssueGatePass
      actions={<LotActions lot={lot} onChanged={handleStageUpdated} onDeleted={() => router.push("/lots")} />}
      afterPipeline={
        <>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="lg:col-span-3">
              {lot.hold ? (
                <motion.div
                  variants={itemVariants}
                  className="h-full flex items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl shadow-sm text-sm text-gray-600"
                  data-testid="lot-stage-stopped"
                >
                  <PauseCircle size={20} className="shrink-0 text-amber-600" />
                  The invoice is stopped. Press “Resume” at the top to continue with the next step.
                </motion.div>
              ) : (
                <StageActionPanel lot={lot} onUpdated={handleStageUpdated} />
              )}
            </div>
            <div className="lg:col-span-2">
              <ShortfallPanel lot={lot} ledgerHref={`/ledger?lot=${lot._id}`} />
            </div>
          </div>
          {lot.stage === "ready" && !lot.hold && <DispatchOutPanel lot={lot} onUpdated={handleStageUpdated} />}
          <WorkPanel lot={lot} />
        </>
      }
    />
  );
}
