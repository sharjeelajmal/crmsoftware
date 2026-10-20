"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, PackagePlus, RefreshCw, ClipboardList } from "lucide-react";
import { FaWallet } from "react-icons/fa";
import { containerVariants, itemVariants } from "@/constants/animations";
import { formatMoney } from "@/lib/format";
import { Loader } from "@/components/ui/Loader";
import { StatCard } from "@/components/ui/StatCard";
import { AddProductPopup } from "@/features/inventory/components/AddProductPopup";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { SalesByHourChart } from "@/features/dashboard/components/SalesByHourChart";
import { StockAlert } from "@/features/dashboard/components/StockAlert";
import { ProductionWidget } from "@/features/dashboard/components/ProductionWidget";
import { Calculator } from "@/features/dashboard/components/Calculator";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { ActionButton } from "@/features/dashboard/components/ActionButton";

export default function Home() {
  const { analytics, products, categories, isLoading, addProduct } = useDashboard();
  const [showAddProduct, setShowAddProduct] = useState(false);

  const handleAddProduct = async (product) => {
    if (await addProduct(product)) setShowAddProduct(false);
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {showAddProduct && (
          <AddProductPopup
            categories={categories}
            initialCategory={categories[0] || ""}
            onSave={handleAddProduct}
            onCancel={() => setShowAddProduct(false)}
          />
        )}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <StatCard icon={FaWallet} title="Today's Income" value={formatMoney(analytics?.totalRevenue)} />
              <StatCard icon={ShoppingCart} title="Today's Sales" value={analytics?.totalSales || 0} />
              <StatCard
                icon={RefreshCw}
                title="Total Recovery Due"
                value={formatMoney(analytics?.recoveryData?.totalDues)}
              />
              <StatCard
                icon={ClipboardList}
                title="Today's Purchasing Value"
                value={formatMoney(analytics?.totalPurchaseValue)}
              />
            </motion.div>

            <SalesByHourChart data={analytics?.chartData} />
            <StockAlert products={products} />
          </div>

          <motion.div variants={containerVariants} className="space-y-4 sm:space-y-6">
            <ProductionWidget />
            <Calculator />
            <QuickActions />
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center"
            >
              <div className="w-full p-4 bg-gray-100 rounded-lg flex flex-col items-center mb-4">
                <PackagePlus size={48} className="text-primary" />
              </div>
              <ActionButton onClick={() => setShowAddProduct(true)}>Add New Item</ActionButton>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
