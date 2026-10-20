"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { STOCK_FILTERS, matchesStockFilter } from "@/features/inventory/utils";
import { LowStockItem } from "./LowStockItem";

const FILTER_OPTIONS = [STOCK_FILTERS.LOW, STOCK_FILTERS.OUT];

/** Products running low (or out) with a filter to switch between the two lists. */
export function StockAlert({ products }) {
  const [stockFilter, setStockFilter] = useState(STOCK_FILTERS.LOW);
  const visible = products.filter((product) => matchesStockFilter(product, stockFilter));

  return (
    <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Stock Alert</h2>
        <CustomDropdown
          options={FILTER_OPTIONS}
          selected={stockFilter}
          onSelect={setStockFilter}
          containerClassName="w-40"
        />
      </div>
      <div className="space-y-3 h-40 overflow-y-auto pr-2">
        {visible.length > 0 ? (
          visible.map((product) => (
            <LowStockItem
              key={product._id}
              name={product.name}
              price={product.salePrice}
              remaining={product.remaining}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 pt-8">
            {stockFilter === STOCK_FILTERS.LOW ? "No low stock items!" : "No out of stock items!"}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default StockAlert;
