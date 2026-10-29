"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { errorMessage } from "@/lib/api-client";
import { Loader } from "@/components/ui/Loader";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";
import { LotDetail } from "@/features/cutting/components/LotDetail";

export default function CuttingLotPage() {
  const { id } = useParams();
  const { lot, isLoading, error } = useLotDetail(id);

  if (isLoading) return <Loader />;

  if (!lot) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
        <p className="text-gray-500">{error ? errorMessage(error, "Lot not found") : "Lot not found."}</p>
        <Link href="/cutting" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to My Lots
        </Link>
      </div>
    );
  }

  return (
    <LotDetail lot={lot} backHref="/cutting" backLabel="My Lots" editHref={`/cutting/${lot._id}/edit`} cuttingView />
  );
}
