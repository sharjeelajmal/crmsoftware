"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { SuggestInput } from "@/components/ui/SuggestInput";
import { Collapse } from "@/components/ui/Collapse";
import { blankSizeRows, categoryOf, sumSizes } from "../utils";
import { SizeRowsEditor } from "./SizeRowsEditor";
import { Switch } from "@/components/ui/Switch";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/**
 * Add-product form used by the inventory page and the dashboard "Add New Item" card.
 * `onSave` receives `{ name, category, remaining, sizes? }`; `sizes` is present only when "Track sizes" is on (the
 * total is then their sum). No purchase or sale price (client, 2026-11-19: that is the shop's khata, not the factory's).
 * `withStock={false}` (the cutting form's "New article"): no quantities — the article starts at 0 and its stock comes
 * when an invoice of it is ready; its sizes still fill the cutting rows. `allowNewCategory`: the category is picked
 * or typed (a new one is the caller's to create).
 */
export function AddProductPopup({
  categories,
  initialCategory,
  onSave,
  onCancel,
  withStock = true,
  allowNewCategory = false,
  title = "Add New Product",
  submitLabel = "Add Product",
  isSaving = false,
}) {
  const [product, setProduct] = useState({
    name: "",
    category: initialCategory,
    remaining: "",
  });
  const [trackSizes, setTrackSizes] = useState(false);
  const [sizes, setSizes] = useState(blankSizeRows);

  const handleChange = (e) => setProduct((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (isSaving) return;
    const stock = withStock ? product : { ...product, remaining: "0" };
    onSave(trackSizes ? { ...stock, remaining: sumSizes(sizes), sizes } : stock);
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel}>
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">{title}</h3>
      <div className="space-y-4">
        {allowNewCategory ? (
          <div>
            <SuggestInput
              value={product.category}
              onChange={(category) => setProduct((prev) => ({ ...prev, category }))}
              onPick={(option) => setProduct((prev) => ({ ...prev, category: option.label }))}
              options={categories.map((category) => ({ value: category, label: category }))}
              placeholder="Category — choose or type a new one"
              maxLength={80}
              testId="product-form-category"
              className={INPUT_CLASS}
            />
            {product.category.trim() && !categoryOf(categories, product.category) && (
              <p className="mt-1 text-xs text-gray-500" data-testid="product-form-new-category">
                New category — it is added with the article.
              </p>
            )}
          </div>
        ) : (
          <CustomDropdown
            options={categories}
            selected={product.category}
            onSelect={(category) => setProduct((prev) => ({ ...prev, category }))}
            label="Category"
            containerClassName="w-full"
            buttonClassName="bg-gray-100"
          />
        )}
        <input
          autoComplete="off"
          type="text"
          name="name"
          value={product.name}
          onChange={handleChange}
          placeholder="Enter Name"
          className={INPUT_CLASS}
          data-testid="product-form-name"
          autoFocus
        />
        <div>
          <Switch
            label={withStock ? "Track stock per size" : "This article has sizes"}
            description={
              withStock ? undefined : "Its sizes fill the cutting rows. Stock comes when an invoice is ready."
            }
            checked={trackSizes}
            onChange={setTrackSizes}
            testId="product-track-sizes"
          />
          <Collapse open={trackSizes} testId="product-sizes-section">
            <div className="pt-4">
              <SizeRowsEditor rows={sizes} onChange={setSizes} quantityLabel="Starting qty" withQuantity={withStock} />
            </div>
          </Collapse>
        </div>
        {withStock && (
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
        )}
      </div>
      <div className="flex justify-end mt-8">
        <Button
          size="lg"
          data-testid="product-form-submit"
          className="w-full sm:w-auto"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default AddProductPopup;
