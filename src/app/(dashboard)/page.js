"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircleAlert, Layers, Scissors, Spool, TriangleAlert } from "lucide-react";
import { containerVariants } from "@/constants/animations";
import { IDLE_WARN_DAYS, compactNumber, percentChange, plural } from "@/constants/dashboard";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AddProductPopup } from "@/features/inventory/components/AddProductPopup";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { DashboardSkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { WelcomeBar } from "@/features/dashboard/components/WelcomeBar";
import { ShopToday, SHOW_SHOP } from "@/features/dashboard/components/ShopToday";
import { HeroProduction } from "@/features/dashboard/components/HeroProduction";
import { KpiTile } from "@/features/dashboard/components/KpiTile";
import { DeltaBadge } from "@/features/dashboard/components/DeltaBadge";
import { PipelineFlow } from "@/features/dashboard/components/PipelineFlow";
import { ProductionTrend } from "@/features/dashboard/components/ProductionTrend";
import { WaitingLots } from "@/features/dashboard/components/WaitingLots";
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed";
import { StockHealth } from "@/features/dashboard/components/StockHealth";
import { SpendingCard } from "@/features/dashboard/components/SpendingCard";
import { WorkersCard } from "@/features/dashboard/components/WorkersCard";
import { GatePassFeed } from "@/features/dashboard/components/GatePassFeed";
import { Calculator } from "@/features/dashboard/components/Calculator";

const GAP = "gap-4 sm:gap-5";

/**
 * Factory dashboard (admin home). One request (GET /api/dashboard) feeds every card; the page refreshes itself
 * every minute while it is open. Layout: welcome + actions → hero & KPI tiles → pipeline → trend & waiting lots
 * → activity, stock, spending → workers & gate passes.
 */
export default function Home() {
  const { dashboard, categories, isLoading, isFetching, reload, addProduct } = useDashboard();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const handleAddProduct = async (product) => {
    if (await addProduct(product)) setShowAddProduct(false);
  };

  if (isLoading) return <DashboardSkeleton />;

  if (!dashboard) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl bg-white border border-border/70 shadow-soft p-8 text-center">
        <CircleAlert size={32} className="mx-auto text-danger" />
        <h1 className="mt-3 text-lg font-semibold text-gray-800">The dashboard could not load</h1>
        <p className="mt-1 text-sm text-gray-500">Check the internet connection and try again.</p>
        <Button className="mt-5" onClick={reload} disabled={isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const { production, trend, stock } = dashboard;
  const now = new Date(dashboard.generatedAt);

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
        {showCalculator && (
          <Modal size="sm" padded={false} onClose={() => setShowCalculator(false)}>
            <Calculator />
          </Modal>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-5 sm:space-y-6"
        data-testid="dashboard"
      >
        <WelcomeBar
          name={dashboard.viewer?.name}
          generatedAt={dashboard.generatedAt}
          isRefreshing={isFetching}
          onRefresh={reload}
          onAddItem={() => setShowAddProduct(true)}
          onCalculator={() => setShowCalculator(true)}
        />

        {SHOW_SHOP && <ShopToday />}

        <div className={`grid grid-cols-1 xl:grid-cols-12 ${GAP}`}>
          <HeroProduction production={production} trend={trend} now={now} className="xl:col-span-5" />
          <div className={`xl:col-span-7 grid grid-cols-2 ${GAP}`}>
            <KpiTile
              icon={Scissors}
              label="Cut today"
              value={production.cutToday.pieces}
              unit="pcs"
              delta={
                <DeltaBadge
                  value={percentChange(production.cutToday.pieces, production.cutYesterday.pieces)}
                  against="vs yesterday"
                />
              }
              trend={trend.map((day) => day.cut)}
              href="/lots?stage=cutting"
              testId="dash-kpi-cut"
            />
            <KpiTile
              icon={Layers}
              label="Invoices in process"
              value={production.inProcess.lots}
              unit={plural(production.inProcess.lots, "invoice")}
              hint={`${compactNumber(production.inProcess.pieces)} pcs between cutting and packing`}
              meter={{
                value: production.inProcess.lots - production.inProcess.stalled,
                max: production.inProcess.lots,
                label:
                  production.inProcess.lots === 0
                    ? "No invoices in process"
                    : production.inProcess.stalled > 0
                      ? `${production.inProcess.stalled} ${plural(production.inProcess.stalled, "invoice")} without movement for ${IDLE_WARN_DAYS}+ days`
                      : `Every invoice moved in the last ${IDLE_WARN_DAYS} days`,
              }}
              href="/lots"
              testId="dash-kpi-process"
            />
            <KpiTile
              icon={Spool}
              label="Lying in stitching"
              value={production.stitching.lying}
              unit="pcs"
              hint={`${production.stitching.lots} ${plural(production.stitching.lots, "invoice")} at stitching`}
              meter={{
                value: production.stitching.out,
                max: production.stitching.received,
                label: `${compactNumber(production.stitching.out)} of ${compactNumber(production.stitching.received)} pcs already sent on`,
              }}
              href="/stitching"
              testId="dash-kpi-stitching"
            />
            <KpiTile
              icon={TriangleAlert}
              label="Stock alerts"
              value={stock.out + stock.low}
              unit={plural(stock.out + stock.low, "product")}
              tone={stock.out > 0 ? "danger" : stock.low > 0 ? "warning" : "success"}
              hint={`${stock.out} out of stock · ${stock.low} running low`}
              meter={{
                value: Math.max(0, stock.products - stock.out - stock.low),
                max: stock.products,
                label: `${Math.max(0, stock.products - stock.out - stock.low)} of ${stock.products} products well stocked`,
              }}
              href="/inventory"
              testId="dash-kpi-stock"
            />
          </div>
        </div>

        <PipelineFlow production={production} />

        <div className={`grid grid-cols-1 xl:grid-cols-3 ${GAP}`}>
          <ProductionTrend trend={trend} className="xl:col-span-2" />
          <WaitingLots lots={production.waiting} />
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 ${GAP}`}>
          <ActivityFeed events={dashboard.activity} />
          <StockHealth stock={stock} />
          <SpendingCard money={dashboard.money} className="md:col-span-2 xl:col-span-1" />
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-2 ${GAP}`}>
          <WorkersCard wages={dashboard.wages} />
          <GatePassFeed passes={dashboard.gatePasses} />
        </div>
      </motion.div>
    </>
  );
}
