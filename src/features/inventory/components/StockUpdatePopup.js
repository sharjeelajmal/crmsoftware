"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { hasSizes, sizeOptions } from "../utils";

/**
 * Asks how many pieces to add to / remove from a product's stock.
 * For a product that tracks sizes the user also picks which size; `onSave(quantity, size)`.
 */
export function StockUpdatePopup({ product, action, onSave, onCancel }) {
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const sized = hasSizes(product);
  const selected = sized ? product.sizes.find((row) => row.size === size) : null;

  return (
    <Modal onClose={onCancel}>
      <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">
        {action === "add" ? "Increase" : "Decrease"} Stock
      </h3>
      <p className="mb-6 text-center text-gray-500">for {product?.name}</p>
      {sized && (
        <div className="mb-4" data-testid="stock-size-select">
          <SelectDropdown options={sizeOptions(product)} selected={size} onSelect={setSize} placeholder="Select Size" />
          {selected && (
            <p className="mt-2 text-sm text-center text-gray-500">
              Size {selected.size} currently has {Number(selected.remaining) || 0} pcs
            </p>
          )}
        </div>
      )}
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
        className="w-full p-3 text-center text-xl bg-gray-100 rounded-xl outline-none mb-6"
      />
      <div className="flex justify-end">
        <Button
          size="lg"
          data-testid="stock-update-submit"
          className="w-full sm:w-auto"
          onClick={() => onSave(quantity, sized ? size : undefined)}
        >
          Update Stock
        </Button>
      </div>
    </Modal>
  );
}

export default StockUpdatePopup;
