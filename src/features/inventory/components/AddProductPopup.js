"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { Collapse } from "@/components/ui/Collapse";
import { blankSizeRows, sumSizes } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";
import { Switch } from "@/components/ui/Switch";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/**
 * Add-product form used by the inventory page and the dashboard "Add New Item" card.
 * `onSave` receives `{ name, category, purchasePrice, salePrice, remaining, sizes? }`;
 * `sizes` is present only when "Track sizes" is on (the total is then their sum).
 */
export function AddProductPopup({ categories, initialCategory, onSave, onCancel }) {
  const [product, setProduct] = useState({
    name: "",
    category: initialCategory,
    purchasePrice: "",
    salePrice: "",
    remaining: "",
  });
  const [trackSizes, setTrackSizes] = useState(false);
  const [sizes, setSizes] = useState(blankSizeRows);

  const handleChange = (e) => setProduct((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => onSave(trackSizes ? { ...product, remaining: sumSizes(sizes), sizes } : product);

  return (
    <Modal onClose={onCancel}>
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Product</h3>
      <div className="space-y-4">
        <CustomDropdown
          options={categories}
          selected={product.category}
          onSelect={(category) => setProduct((prev) => ({ ...prev, category }))}
          label="Category"
          containerClassName="w-full"
          buttonClassName="bg-gray-100"
        />
        <input
          autoComplete="off"
          type="text"
          name="name"
          value={product.name}
          onChange={handleChange}
          placeholder="Enter Name"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            autoComplete="off"
            type="number"
            name="purchasePrice"
            value={product.purchasePrice}
            onChange={handleChange}
            placeholder="Enter Purchase Price"
            className={INPUT_CLASS}
          />
          <input
            autoComplete="off"
            type="number"
            name="salePrice"
            value={product.salePrice}
            onChange={handleChange}
            placeholder="Enter Sale Price"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <Switch
            label="Track stock per size"
            checked={trackSizes}
            onChange={setTrackSizes}
            testId="product-track-sizes"
          />
          <Collapse open={trackSizes} testId="product-sizes-section">
            <div className="pt-4">
              <SizeRowsEditor rows={sizes} onChange={setSizes} quantityLabel="Starting qty" />
            </div>
          </Collapse>
        </div>
        <input
          autoComplete="off"
          type="number"
          name="remaining"
          value={trackSizes ? sumSizes(sizes) : product.remaining}
          onChange={handleChange}
          readOnly={trackSizes}
          placeholder="Enter Quantity"
          data-tip={trackSizes ? "Total is the sum of the sizes" : undefined}
          className={`${INPUT_CLASS} transition-colors duration-300 ${trackSizes ? "text-gray-500 cursor-not-allowed" : ""}`}
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" data-testid="product-form-submit" className="w-full sm:w-auto" onClick={handleSave}>
          Add Product
        </Button>
      </div>
    </Modal>
  );
}

export default AddProductPopup;
