"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/api-client";
import { clearAsyncDataCache } from "@/hooks/useAsyncData";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";
import { useDeleteLot } from "@/features/lots/hooks/useDeleteLot";
import { LotDetail } from "@/features/cutting/components/LotDetail";
import { StageActionPanel } from "@/features/lots/components/StageActionPanel";
import { ShortfallPanel } from "@/features/lots/components/ShortfallPanel";

export default function AdminLotPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lot, isLoading, error, reload } = useLotDetail(id);
  const { deleteLot, isDeleting } = useDeleteLot();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <Loader />;

  if (!lot) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">{error ? errorMessage(error, "Lot not found") : "Lot not found."}</p>
        <Link href="/lots" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to Production Lots
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await deleteLot(lot._id);
    setConfirmDelete(false);
    if (ok) router.push("/lots");
  };

  // The stage endpoint returns the updated lot with its events; the cached copy is stale, so refetch.
  const handleStageUpdated = () => {
    clearAsyncDataCache(`lot:${lot._id}`);
    reload();
  };

  const canDelete = lot.stage === "cutting";

  return (
    <>
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            title={`Delete ${lot.lotNumber}?`}
            message="The cutting entry and its history will be removed. This cannot be undone."
            confirmLabel={isDeleting ? "Deleting…" : "Delete lot"}
            onConfirm={isDeleting ? undefined : handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>

      <LotDetail
        lot={lot}
        backHref="/lots"
        backLabel="Production Lots"
        editHref={`/cutting/${lot._id}/edit`}
        actions={
          canDelete ? (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => setConfirmDelete(true)}
              data-testid="lot-delete"
              className="w-full sm:w-auto"
            >
              Delete lot
            </Button>
          ) : null
        }
        afterPipeline={
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="lg:col-span-3">
              <StageActionPanel lot={lot} onUpdated={handleStageUpdated} />
            </div>
            <div className="lg:col-span-2">
              <ShortfallPanel lot={lot} />
            </div>
          </div>
        }
      />
    </>
  );
}
