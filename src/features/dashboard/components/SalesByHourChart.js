"use client";

import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { itemVariants } from "@/constants/animations";
import { useThemeColors } from "@/hooks/useThemeColors";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-surface-glass)",
  backdropFilter: "blur(5px)",
  borderRadius: "10px",
};

/** Today's sales bucketed by hour (`chartData` from /api/analytics?filter=today). */
export function SalesByHourChart({ data }) {
  const colors = useThemeColors();

  return (
    <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Today&apos;s Sales (by Hour)</h2>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="total"
              name="Total Sale"
              stroke={colors.primary}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default SalesByHourChart;
