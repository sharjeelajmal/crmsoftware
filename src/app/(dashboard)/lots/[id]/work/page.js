"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { errorMessage } from "@/lib/api-client";
import { Loader } from "@/components/ui/Loader";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";
import { workPiecesOf } from "@/constants/wages";
import { WorkSheet } from "@/features/wages/components/WorkSheet";

/** Assign work on an invoice: every operation with its workers on one sheet, saved in one go (admin). */
export default function LotWorkPage() {
  const { id } = useParams();
  const router = useRouter();
  const { lot, isLoading, error } = useLotDetail(id);

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

  const backHref = `/lots/${lot._id}`;
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
      data-testid="work-sheet-page"
    >
      <motion.div variants={itemVariants}>
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft size={16} /> Back to {lot.lotNumber}
        </Link>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-800">Assign work</h1>
        <p className="text-gray-500 mt-1">
          {lot.lotNumber} · {lot.productName} · {workPiecesOf(lot)} pcs. Pick the worker for each operation and save
          everything in one go.
        </p>
      </motion.div>
      {lot.hold ? (
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl shadow-sm text-center text-gray-600"
          data-testid="work-sheet-stopped"
        >
          {lot.lotNumber} is stopped. Resume it on the invoice page to assign work.
        </motion.div>
      ) : (
        <WorkSheet lot={lot} backHref={backHref} onSaved={() => router.push(backHref)} />
      )}
    </motion.div>
  );
}
