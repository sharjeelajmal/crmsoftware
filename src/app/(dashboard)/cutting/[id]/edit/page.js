"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Lock } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { errorMessage } from "@/lib/api-client";
import { Loader } from "@/components/ui/Loader";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";
import { LotForm } from "@/features/cutting/components/LotForm";

export default function EditCuttingEntryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lot, isLoading, error } = useLotDetail(id);

  if (isLoading) return <Loader />;

  const detailHref = `/cutting/${id}`;

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

  if (lot.stage !== "cutting") {
    return (
      <div
        className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm text-center space-y-4"
        data-testid="lot-edit-locked"
      >
        <Lock size={40} className="mx-auto text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-800">{lot.lotNumber} can no longer be edited</h1>
        <p className="text-gray-600">Cutting details are locked once the lot has left cutting.</p>
        <Link href={detailHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to {lot.lotNumber}
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 max-w-3xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <Link
          href={detailHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3"
        >
          <ArrowLeft size={16} /> {lot.lotNumber}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Edit {lot.lotNumber}</h1>
        <p className="text-gray-500 mt-1">
          Update the article, fabric or pieces cut. Changes are kept in the lot history.
        </p>
      </motion.div>

      <LotForm key={lot._id} lot={lot} onSaved={() => router.push(detailHref)} cancelHref={detailHref} />
    </motion.div>
  );
}
