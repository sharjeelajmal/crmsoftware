"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { PurchaseCard } from "./PurchaseCard";

export function PurchaseHistoryView({ purchases, products, vendors, onDelete }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr"
    >
      {purchases.length > 0 ? (
        purchases.map((purchase) => (
          <PurchaseCard
            key={purchase._id}
            purchase={purchase}
            product={products.find((product) => product._id === purchase.productId)}
            vendor={vendors.find((vendor) => vendor._id === purchase.vendorId)}
            onDelete={onDelete}
          />
        ))
      ) : (
        <p className="col-span-full text-center py-10 text-gray-500">No purchase records found.</p>
      )}
    </motion.div>
  );
}

export default PurchaseHistoryView;
