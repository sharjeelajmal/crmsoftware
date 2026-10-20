"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { itemVariants } from "@/constants/animations";
import { useThemeColors } from "@/hooks/useThemeColors";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-surface-glass)",
  backdropFilter: "blur(5px)",
  borderRadius: "10px",
};

/** Total sale vs profit bars for the selected period. */
export function SalesChart({ label, chartData }) {
  const colors = useThemeColors();

  return (
    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{label}</h2>
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="total" fill={colors.primary} name="Total Sale" radius={[8, 8, 0, 0]} />
            <Bar dataKey="profit" fill={colors.successLight} name="Profit" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
