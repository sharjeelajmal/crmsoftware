"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { hasSizes, sizeRowsOf } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/**
 * Edits a product's details and, when it tracks sizes, its size list.
 * `onSave` receives `{ name, category, purchasePrice, salePrice, sizes? }`.
 */
export function EditProductPopup({ product, categories, onSave, onCancel }) {
  const tracked = hasSizes(product);
  const [form, setForm] = useState({
    name: product.name ?? "",
    category: product.category ?? "",
    purchasePrice: String(product.purchasePrice ?? ""),
    salePrice: String(product.salePrice ?? ""),
  });
  const [sizes, setSizes] = useState(() => sizeRowsOf(product));

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <Modal onClose={onCancel}>
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Edit Product</h3>
      <div className="space-y-4">
        <CustomDropdown
          options={categories}
          selected={form.category}
          onSelect={(category) => setForm((prev) => ({ ...prev, category }))}
          label="Category"
          containerClassName="w-full"
          buttonClassName="bg-gray-100"
        />
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter Name"
          className={INPUT_CLASS}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="number"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            placeholder="Enter Purchase Price"
            className={INPUT_CLASS}
          />
          <input
            type="number"
            name="salePrice"
            value={form.salePrice}
            onChange={handleChange}
            placeholder="Enter Sale Price"
            className={INPUT_CLASS}
          />
        </div>
        {tracked ? (
          <SizeRowsEditor rows={sizes} onChange={setSizes} quantityLabel="In stock" />
        ) : (
          <p className="text-sm text-gray-500">
            In stock: <span className="font-semibold text-gray-800">{product.remaining} pcs</span> (use the +/- buttons
            on the product row to change it)
          </p>
        )}
      </div>
      <div className="flex justify-end mt-8">
        <Button
          size="lg"
          data-testid="product-form-submit"
          className="w-full sm:w-auto"
          onClick={() => onSave(tracked ? { ...form, sizes } : form)}
        >
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}

export default EditProductPopup;
