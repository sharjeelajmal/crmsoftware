"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, Search, Users, UserX } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { StatCard } from "@/components/ui/StatCard";
import { Loader } from "@/components/ui/Loader";
import { formatMoney } from "@/lib/format";
import { useRecovery } from "@/features/recovery/hooks/useRecovery";
import { RecoveryTable } from "@/features/recovery/components/RecoveryTable";
import { filterDebtors } from "@/features/recovery/utils";

const SEARCH_INPUT_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 outline-none " +
  "focus:ring-2 focus:ring-transparent focus:border-primary focus:scale-105 transition-transform duration-300";

export default function RecoveryPage() {
  const { customers, stats, isLoading, updateBalance } = useRecovery();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCustomers = filterDebtors(customers, searchTerm);

  if (isLoading) return <Loader />;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 sm:space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Recovery Center</h1>
          <p className="text-gray-500 mt-1">Manage all outstanding customer dues here.</p>
        </motion.div>

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <StatCard icon={DollarSign} title="Total Outstanding Dues" value={formatMoney(stats.totalDues)} />
          <StatCard icon={Users} title="Customers with Dues" value={stats.totalCustomersWithDues || 0} />
          <StatCard icon={UserX} title="Top Debtor" value={stats.topDebtorName || "N/A"} />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Pending Payments</h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={SEARCH_INPUT_CLASS}
              />
            </div>
          </div>

          <RecoveryTable customers={filteredCustomers} onSaveBalance={updateBalance} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
