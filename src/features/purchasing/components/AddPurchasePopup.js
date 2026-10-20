"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { hasSizes, sizeOptions } from "@/features/inventory/utils";
import { ProductSuggestionInput } from "./ProductSuggestionInput";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

export function AddPurchasePopup({ products, vendors, onSave, onCancel }) {
  const [purchase, setPurchase] = useState({
    productId: "",
    vendorId: "",
    quantity: "",
    costPerItem: "",
    purchaseDate: new Date(),
    size: "",
  });
  const [productName, setProductName] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const selectedProduct = products.find((product) => product._id === purchase.productId);

  const handleChange = (e) => setPurchase((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Picking a product pre-fills the last known purchase price and clears any size from a previous pick.
  const handleProductSelect = (product) => {
    setPurchase((prev) => ({ ...prev, productId: product._id, costPerItem: product.purchasePrice || "", size: "" }));
    setProductName(product.name);
  };

  const handleDateSelect = (date) => {
    if (date) setPurchase((prev) => ({ ...prev, purchaseDate: date }));
    setShowCalendar(false);
  };

  const vendorOptions = vendors.map((vendor) => ({ value: vendor._id, label: vendor.name }));

  return (
    <Modal onClose={onCancel} size="lg">
      <h3 className="text-2xl font-bold mb-6 text-center">Record New Purchase</h3>
      <div className="space-y-4">
        <ProductSuggestionInput
          products={products}
          value={productName}
          onChange={setProductName}
          onSelect={handleProductSelect}
        />
        {hasSizes(selectedProduct) && (
          <div data-testid="purchase-size">
            <SelectDropdown
              options={sizeOptions(selectedProduct)}
              selected={purchase.size}
              onSelect={(size) => setPurchase((prev) => ({ ...prev, size }))}
              placeholder="Select Size"
            />
          </div>
        )}
        <SelectDropdown
          options={vendorOptions}
          selected={purchase.vendorId}
          onSelect={(vendorId) => setPurchase((prev) => ({ ...prev, vendorId }))}
          placeholder="Select Vendor"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="number"
            name="quantity"
            value={purchase.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            className={INPUT_CLASS}
          />
          <input
            type="number"
            name="costPerItem"
            value={purchase.costPerItem}
            onChange={handleChange}
            placeholder="Cost per Item"
            className={INPUT_CLASS}
          />
        </div>
        <div className="relative">
          <input
            type="text"
            readOnly
            value={purchase.purchaseDate ? format(purchase.purchaseDate, "dd MMM, yyyy") : ""}
            onClick={() => setShowCalendar((open) => !open)}
            className={`${INPUT_CLASS} cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner`}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onSave(purchase)}>
          Record Purchase
        </Button>
      </div>
      {showCalendar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"
        >
          <DayPicker mode="single" selected={purchase.purchaseDate} onSelect={handleDateSelect} />
        </motion.div>
      )}
    </Modal>
  );
}

export default AddPurchasePopup;
