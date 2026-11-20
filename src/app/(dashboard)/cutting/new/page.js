"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { ROLES } from "@/constants/roles";
import { useRole } from "@/hooks/useRole";
import { LotForm } from "@/features/cutting/components/LotForm";

/** New cutting entry — the cutting master's, and the admin's from Invoices (who goes back to the admin pages). */
export default function NewCuttingEntryPage() {
  const router = useRouter();
  const isAdmin = useRole() === ROLES.ADMIN;
  const home = isAdmin ? "/lots" : "/cutting";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 max-w-3xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <Link href={home} className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3">
          <ArrowLeft size={16} /> {isAdmin ? "Invoices" : "My Invoices"}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">New Cutting Entry</h1>
        <p className="text-gray-500 mt-1">
          Record the article, fabric and pieces cut per size. An invoice number is assigned on save.
        </p>
      </motion.div>

      <LotForm onSaved={(lot) => router.push(`${isAdmin ? "/lots" : "/cutting"}/${lot._id}`)} cancelHref={home} />
    </motion.div>
  );
}
