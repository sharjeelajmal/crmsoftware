"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { Collapse } from "@/components/ui/Collapse";
import { blankSizeRows, hasSizes, sizeRowsOf, sizeSplitHint } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/**
 * Edits a product's details and its size list. A product without sizes can be switched to per-size
 * stock here: the current total is split across the rows (their sum becomes the new total).
 * `onSave` receives `{ name, category, purchasePrice, salePrice, sizes? }`.
 */
export function EditProductPopup({ product, categories, onSave, onCancel }) {
  const alreadyTracked = hasSizes(product);
  const [trackSizes, setTrackSizes] = useState(alreadyTracked);
  const [form, setForm] = useState({
    name: product.name ?? "",
    category: product.category ?? "",
    purchasePrice: String(product.purchasePrice ?? ""),
    salePrice: String(product.salePrice ?? ""),
  });
  const [sizes, setSizes] = useState(() => (alreadyTracked ? sizeRowsOf(product) : blankSizeRows()));

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const enabling = trackSizes && !alreadyTracked;
  const hint = enabling ? sizeSplitHint(product, sizes) : null;

  return (
    <Modal onClose={onCancel}>
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Edit Product</h3>
      <div className="space-y-4" data-testid="product-edit-form">
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

        <div>
          {!alreadyTracked && (
            <label className="flex items-center justify-between gap-3 p-3 bg-gray-100 rounded-xl cursor-pointer">
              <span className="text-sm font-semibold text-gray-700">
                Track stock per size
                <span className="block text-xs font-normal text-gray-500">
                  Current stock: {Number(product.remaining) || 0} pcs — split it across sizes below.
                </span>
              </span>
              <input
                type="checkbox"
                data-testid="product-track-sizes"
                checked={trackSizes}
                onChange={(e) => setTrackSizes(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer shrink-0"
              />
            </label>
          )}

          <Collapse open={trackSizes} testId="product-sizes-section">
            <div className={`space-y-2 ${alreadyTracked ? "" : "pt-4"}`}>
              <SizeRowsEditor rows={sizes} onChange={setSizes} quantityLabel="In stock" />
              {hint && (
                <p
                  className={`text-xs ${hint.diff === 0 ? "text-success" : "text-warning"} font-medium transition-colors`}
                  data-testid="product-size-hint"
                  data-diff={hint.diff}
                >
                  {hint.message}
                </p>
              )}
            </div>
          </Collapse>
          <Collapse open={!trackSizes}>
            <p className="text-sm text-gray-500 pt-4">
              In stock: <span className="font-semibold text-gray-800">{product.remaining} pcs</span> (use the +/-
              buttons on the product row to change it)
            </p>
          </Collapse>
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button
          size="lg"
          data-testid="product-form-submit"
          className="w-full sm:w-auto"
          onClick={() => onSave(trackSizes ? { ...form, sizes } : form)}
        >
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}

export default EditProductPopup;
