"use client";

import { motion } from "framer-motion";
import { Scissors, ShieldCheck, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ROLES } from "@/constants/roles";
import { countByRole } from "../utils";

export function UserStats({ users }) {
  return (
    <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      <StatCard icon={Users} title="Total Users" value={users.length} />
      <StatCard icon={ShieldCheck} title="Administrators" value={countByRole(users, ROLES.ADMIN)} />
      <StatCard icon={Scissors} title="Cutting Masters" value={countByRole(users, ROLES.CUTTING_MASTER)} />
    </motion.div>
  );
}

export default UserStats;
