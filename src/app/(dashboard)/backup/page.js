"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { FilterButton } from "@/components/ui/FilterButton";
import { useBackup } from "@/features/backup/hooks/useBackup";
import { CollectionStatCard } from "@/features/backup/components/CollectionStatCard";
import { BackupStatusMessage } from "@/features/backup/components/BackupStatusMessage";
import { DownloadBackupButton } from "@/features/backup/components/DownloadBackupButton";
import { BACKUP_FILTERS, DEFAULT_BACKUP_FILTER } from "@/features/backup/utils";

export default function BackupPage() {
  const { stats, isLoading, isBackingUp, status, downloadBackup } = useBackup();
  const [filter, setFilter] = useState(DEFAULT_BACKUP_FILTER);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading database stats...</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-4xl mx-auto"
    >
      <motion.div variants={itemVariants} className="text-center">
        <div className="inline-block p-5 bg-white rounded-full shadow-lg">
          <Database className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mt-4">Database Backup</h1>
        <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
          Select a time period and download a user-friendly CSV backup of your sales data.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Time Period for Sales Backup</h2>
        <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-2 sm:gap-3 p-2 bg-gray-100 rounded-xl">
          {BACKUP_FILTERS.map(({ value, label }) => (
            <FilterButton key={value} label={label} active={filter === value} onClick={() => setFilter(value)} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center pt-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">2. Generate &amp; Download</h2>
        <DownloadBackupButton isBusy={isBackingUp} onClick={() => downloadBackup(filter)} />
        <BackupStatusMessage status={status} />
      </motion.div>

      <motion.div variants={containerVariants} className="pt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Total Records in Database</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <CollectionStatCard key={stat.name} collectionName={stat.name} count={stat.count} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
