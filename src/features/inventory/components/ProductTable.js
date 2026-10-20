"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { Loader } from "@/components/ui/Loader";
import { ProductRow } from "./ProductRow";

export function ProductTable({ products, isLoading, onStockChange, onEdit, onDelete }) {
  return (
    <>
      <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium">
        <span className="flex-grow">Product Name</span>
        <span className="w-32 text-center">Purchase Price</span>
        <span className="w-32 text-center">Sale Price</span>
        <span className="w-32 text-center">Remaining</span>
        <span className="w-32 text-center">Actions</span>
      </div>
      <motion.div variants={containerVariants} className="space-y-3">
        {isLoading ? (
          <Loader inline />
        ) : (
          products.map((product) => (
            <ProductRow
              key={product._id}
              product={product}
              onStockChange={onStockChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
        {!isLoading && products.length === 0 && (
          <p className="text-center text-gray-500 py-8">No products found. Add a new product to get started!</p>
        )}
      </motion.div>
    </>
  );
}

export default ProductTable;
