"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary";

/**
 * Adds a category from the Workers page (client, 2026-11-06: each pant type gets its own operations). The same
 * category is offered in Inventory for the articles; its rate card is set right after.
 */
export function CategoryFormPopup({ onSave, onCancel, isSaving = false }) {
  const toast = useToast();
  const [name, setName] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.info("Please enter the category name.");
      return;
    }
    onSave(name.trim());
  };

  return (
    <Modal onClose={isSaving ? undefined : onCancel}>
      <form noValidate onSubmit={handleSubmit} className="space-y-4" data-testid="category-form">
        <h3 className="text-2xl font-bold text-center text-gray-800 mb-2">Add Category</h3>
        <input
          autoComplete="off"
          type="text"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category (e.g. Baggy Pent, Simple Pent)"
          className={INPUT_CLASS}
          data-testid="category-form-name"
          autoFocus
          required
        />
        <p className="text-xs text-gray-500">
          Next you tick the operations this category needs and the rate of each. Articles of this category (Inventory)
          then get exactly these operations when work is assigned.
        </p>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSaving}
            className="w-full sm:w-auto"
            data-testid="category-form-submit"
          >
            {isSaving ? "Saving…" : "Add & set operations"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CategoryFormPopup;
