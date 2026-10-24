"use client";

import { Activity, DollarSign, Scissors, ShoppingCart, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { formatMoney } from "@/lib/format";

export function AnalyticsStats({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-8">
      <StatCard icon={DollarSign} title="Revenue (Period)" value={formatMoney(data.totalRevenue)} />
      <StatCard icon={Activity} title="Profit (Period)" value={formatMoney(data.totalProfit)} />
      <StatCard icon={ShoppingCart} title="Sales (Period)" value={data.totalSales} />
      <StatCard icon={TrendingUp} title="Avg. Sale Value" value={formatMoney(Math.round(data.avgSaleValue))} />
      <StatCard icon={Scissors} title="Produced (Period)" value={`${data.producedPieces ?? 0} pcs`} />
    </div>
  );
}
