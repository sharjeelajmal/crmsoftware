"use client";

import { motion } from "framer-motion";
import { containerVariants } from "@/constants/animations";
import { VendorCard } from "./VendorCard";

export function VendorManagementView({ vendors, onEdit, onDelete }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-fr"
    >
      {vendors.length > 0 ? (
        vendors.map((vendor) => <VendorCard key={vendor._id} vendor={vendor} onEdit={onEdit} onDelete={onDelete} />)
      ) : (
        <p className="col-span-full text-center py-10 text-gray-500">No vendors found.</p>
      )}
    </motion.div>
  );
}

export default VendorManagementView;
