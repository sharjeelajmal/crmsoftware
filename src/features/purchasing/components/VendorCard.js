"use client";

import { motion } from "framer-motion";
import { Edit2, Phone, Trash2 } from "lucide-react";
import { itemVariants } from "@/constants/animations";

const ICON_BUTTON_CLASS = "p-2 text-gray-500 cursor-pointer";

export function VendorCard({ vendor, onEdit, onDelete }) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300 h-full"
    >
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-primary">
            {vendor.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{vendor.name}</h3>
            <p className="text-sm text-gray-500">{vendor.contactPerson}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Phone size={14} /> {vendor.phone}
        </p>
      </div>
      <div className="border-t mt-4 pt-3 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onEdit(vendor)}
          className={`${ICON_BUTTON_CLASS} hover:text-blue-600`}
          title="Edit"
        >
          <Edit2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(vendor._id)}
          className={`${ICON_BUTTON_CLASS} hover:text-red-600`}
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

export default VendorCard;
