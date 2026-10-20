"use client";

import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle } from "lucide-react";

const TONE_CLASS = {
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

/** Inline result banner shown under the download button. */
export function BackupStatusMessage({ status }) {
  if (!status.message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 flex items-center justify-center gap-2 p-3 rounded-lg ${TONE_CLASS[status.type] ?? "bg-blue-100 text-blue-800"}`}
    >
      {status.type === "success" && <CheckCircle size={20} />}
      {status.type === "error" && <AlertTriangle size={20} />}
      <p className="font-semibold">{status.message}</p>
    </motion.div>
  );
}

export default BackupStatusMessage;
