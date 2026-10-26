"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { DatePickerField, dateToValue, valueToDate } from "@/components/ui/DatePickerField";
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

  const selectedProduct = products.find((product) => product._id === purchase.productId);

  const handleChange = (e) => setPurchase((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Picking a product pre-fills the last known purchase price and clears any size from a previous pick.
  const handleProductSelect = (product) => {
    setPurchase((prev) => ({ ...prev, productId: product._id, costPerItem: product.purchasePrice || "", size: "" }));
    setProductName(product.name);
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
            autoComplete="off"
            type="number"
            name="quantity"
            value={purchase.quantity}
            onChange={handleChange}
            placeholder="Quantity"
            className={INPUT_CLASS}
          />
          <input
            autoComplete="off"
            type="number"
            name="costPerItem"
            value={purchase.costPerItem}
            onChange={handleChange}
            placeholder="Cost per Item"
            className={INPUT_CLASS}
          />
        </div>
        <DatePickerField
          id="purchase-date"
          value={dateToValue(purchase.purchaseDate)}
          onChange={(value) => setPurchase((prev) => ({ ...prev, purchaseDate: valueToDate(value) }))}
          testId="purchase-date"
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onSave(purchase)}>
          Record Purchase
        </Button>
      </div>
    </Modal>
  );
}

export default AddPurchasePopup;
