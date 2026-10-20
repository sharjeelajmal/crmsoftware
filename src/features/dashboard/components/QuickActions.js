"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { ActionButton } from "./ActionButton";

export function QuickActions() {
  return (
    <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
      <div className="flex flex-col items-center gap-4">
        <Link href="/sales/new" className="w-full">
          <ActionButton>New Sale</ActionButton>
        </Link>
        <Link href="/purchasing" className="w-full">
          <ActionButton>New Purchase</ActionButton>
        </Link>
      </div>
    </motion.div>
  );
}

export default QuickActions;
