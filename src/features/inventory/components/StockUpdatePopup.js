"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SelectDropdown } from "@/components/ui/CustomDropdown";
import { useToast } from "@/components/ui/ToastProvider";
import { hasSizes, sizeOptions } from "../utils";

/**
 * Asks how many pieces to add to / remove from a product's stock.
 * The quantity box starts empty; it is kept as text so the user can clear and retype it freely.
 * For a product that tracks sizes the user also picks which size; `onSave(quantity, size)`.
 */
export function StockUpdatePopup({ product, action, onSave, onCancel }) {
  const toast = useToast();
  const [quantity, setQuantity] = useState("");
  const [size, setSize] = useState("");
  const sized = hasSizes(product);
  const selected = sized ? product.sizes.find((row) => row.size === size) : null;
  const pieces = Math.trunc(Number(quantity));
  const valid = quantity !== "" && Number.isFinite(pieces) && pieces > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!valid) {
      toast.info("Please enter a quantity of 1 or more.");
      return;
    }
    onSave(pieces, sized ? size : undefined);
  };

  return (
    <Modal onClose={onCancel}>
      <form onSubmit={handleSubmit} data-testid="stock-update-form">
        <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">
          {action === "add" ? "Increase" : "Decrease"} Stock
        </h3>
        <p className="mb-6 text-center text-gray-500">for {product?.name}</p>
        {sized && (
          <div className="mb-4" data-testid="stock-size-select">
            <SelectDropdown
              options={sizeOptions(product)}
              selected={size}
              onSelect={setSize}
              placeholder="Select Size"
            />
            {selected && (
              <p className="mt-2 text-sm text-center text-gray-500">
                Size {selected.size} currently has {Number(selected.remaining) || 0} pcs
              </p>
            )}
          </div>
        )}
        <input
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={action === "add" ? "Pieces to add" : "Pieces to remove"}
          aria-label="Quantity"
          autoFocus={!sized}
          data-testid="stock-update-qty"
          className="w-full p-3 text-center text-xl bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary mb-6"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!valid}
            data-testid="stock-update-submit"
            className="w-full sm:w-auto"
          >
            Update Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default StockUpdatePopup;
