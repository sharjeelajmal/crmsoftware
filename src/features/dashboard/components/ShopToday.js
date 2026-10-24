"use client";

import { motion } from "framer-motion";
import { RefreshCw, ShoppingCart } from "lucide-react";
import { FaWallet } from "react-icons/fa";
import { containerVariants } from "@/constants/animations";
import { isModuleVisible } from "@/constants/modules";
import { formatMoney } from "@/lib/format";
import { api } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { StatCard } from "@/components/ui/StatCard";
import { SalesByHourChart } from "./SalesByHourChart";

const SHOW_SALES = isModuleVisible("/sales");
const SHOW_RECOVERY = isModuleVisible("/recovery");

/** Whether the shop strip has anything to show (Sales or Recovery switched on in src/constants/modules.js). */
export const SHOW_SHOP = SHOW_SALES || SHOW_RECOVERY;

/** Today's shop figures. Only rendered while the Sales or Recovery module is switched on. */
export function ShopToday() {
  const { data: analytics } = useAsyncData(() => api.get("/api/analytics?filter=today"), [], {
    cacheKey: "analytics:today",
  });

  return (
    <motion.div variants={containerVariants} className="space-y-4 sm:space-y-5" data-testid="dash-shop">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {SHOW_SALES && (
          <>
            <StatCard icon={FaWallet} title="Today's Income" value={formatMoney(analytics?.totalRevenue)} />
            <StatCard icon={ShoppingCart} title="Today's Sales" value={analytics?.totalSales || 0} />
          </>
        )}
        {SHOW_RECOVERY && (
          <StatCard
            icon={RefreshCw}
            title="Total Recovery Due"
            value={formatMoney(analytics?.recoveryData?.totalDues)}
          />
        )}
      </div>
      {SHOW_SALES && <SalesByHourChart data={analytics?.chartData} />}
    </motion.div>
  );
}

export default ShopToday;
