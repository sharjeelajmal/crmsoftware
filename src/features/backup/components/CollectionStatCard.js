"use client";

import { motion } from "framer-motion";
import { FileJson } from "lucide-react";
import { itemVariants } from "@/constants/animations";

/** Record count for one database collection. */
export function CollectionStatCard({ collectionName, count }) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-6 rounded-2xl shadow-lg flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          <FileJson className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">{collectionName}</h3>
          <p className="text-sm text-gray-500">Collection</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-primary">{count}</p>
        <p className="text-sm text-gray-500">Records</p>
      </div>
    </motion.div>
  );
}

export default CollectionStatCard;
