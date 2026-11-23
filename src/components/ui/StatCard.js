"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";

/**
 * Brand-coloured KPI tile used at the top of every dashboard page. A long value (big amounts, product names) wraps
 * inside the tile instead of being cut off when the tile is narrow (tablet / small laptop). `note` is an optional small
 * line under the value; any other prop (e.g. `data-testid`) goes on the tile.
 */
export function StatCard({ icon: Icon, title, value, note, className = "", ...rest }) {
  return (
    <motion.div
      variants={itemVariants}
      className={`flex items-center p-5 rounded-2xl text-white relative overflow-hidden bg-primary min-w-0 ${className}`}
      {...rest}
    >
      <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full" />
      <div className="p-3 bg-white/20 rounded-full mr-4 shrink-0">
        <Icon size={24} />
      </div>
      <div className="relative min-w-0">
        <h3 className="text-md font-light leading-snug">{title}</h3>
        <p className="text-2xl lg:text-3xl font-bold leading-tight [overflow-wrap:anywhere]">{value}</p>
        {note ? <p className="text-sm font-light text-white/80 leading-snug">{note}</p> : null}
      </div>
    </motion.div>
  );
}

export default StatCard;
