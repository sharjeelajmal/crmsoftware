"use client";

import { motion } from "framer-motion";
import { BarChart, DollarSign, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatMoney } from "@/lib/format";
import { topPerformer, totalSalaries } from "../utils";

export function SalesmanStats({ salesmen }) {
  const best = topPerformer(salesmen);
  return (
    <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={Users} title="Total Salesmen" value={salesmen.length} />
      <StatCard icon={BarChart} title="Top Performer" value={best?.name ?? "N/A"} />
      <StatCard icon={DollarSign} title="Total Monthly Salaries" value={formatMoney(totalSalaries(salesmen))} />
    </motion.div>
  );
}
