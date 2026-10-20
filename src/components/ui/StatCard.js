"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";

/** Brand-coloured KPI tile used at the top of every dashboard page. */
export function StatCard({ icon: Icon, title, value }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center p-5 rounded-2xl text-white relative overflow-hidden bg-primary"
    >
      <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full" />
      <div className="p-3 bg-white/20 rounded-full mr-4">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-md font-light">{title}</h3>
        <p className="text-2xl lg:text-3xl font-bold">{value}</p>
      </div>
    </motion.div>
  );
}

export default StatCard;
