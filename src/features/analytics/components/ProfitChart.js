"use client";

import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { itemVariants } from "@/constants/animations";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatMoney } from "@/lib/format";

const GRADIENT_ID = "colorProfit";

/** Big profit figure with a sparkline-style area chart underneath. */
export function ProfitChart({ filter, totalProfit, chartData }) {
  const colors = useThemeColors();

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white p-5 sm:p-8 rounded-2xl shadow-lg flex flex-col justify-between"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Profit Analysis</h2>
        <div className="text-center my-6">
          <p className="text-gray-500">Total Profit ({filter})</p>
          <p className="text-4xl sm:text-5xl font-bold text-green-600 mt-2 break-all">{formatMoney(totalProfit)}</p>
        </div>
      </div>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.success} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip contentStyle={{ display: "none" }} />
            <Area
              type="monotone"
              dataKey="profit"
              stroke={colors.success}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#${GRADIENT_ID})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
