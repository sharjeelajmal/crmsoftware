"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";

const BUTTON_CLASS =
  "flex items-center justify-center gap-3 w-full max-w-md mx-auto text-white font-bold py-4 px-8 rounded-2xl " +
  "transition-all duration-300 transform focus:outline-none bg-primary hover:bg-opacity-90 hover:scale-105 " +
  "disabled:bg-gray-400 disabled:cursor-not-allowed";

export function DownloadBackupButton({ isBusy, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={isBusy} className={BUTTON_CLASS}>
      {isBusy ? (
        <>
          <motion.div
            className="w-6 h-6 border-4 border-white border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          Processing...
        </>
      ) : (
        <>
          <Download className="w-6 h-6" />
          Download Sales Backup
        </>
      )}
    </button>
  );
}

export default DownloadBackupButton;
