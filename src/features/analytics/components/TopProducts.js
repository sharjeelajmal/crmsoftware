"use client";

import { motion } from "framer-motion";
import { itemVariants } from "@/constants/animations";
import { periodLabel } from "../utils";

export function TopProducts({ filter, products }) {
  return (
    <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Selling Products ({periodLabel(filter)})</h2>
      <ul className="space-y-4">
        {products.length > 0 ? (
          products.map((product, index) => (
            <li key={product.name ?? index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <p className="font-semibold">{product.name}</p>
              </div>
              <p className="font-bold text-lg text-primary">{product.totalSold} pcs</p>
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">No products sold in this period.</p>
        )}
      </ul>
    </motion.div>
  );
}
