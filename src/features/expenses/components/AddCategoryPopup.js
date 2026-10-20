"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function AddCategoryPopup({ onSave, onCancel }) {
  const [name, setName] = useState("");

  return (
    <Modal onClose={onCancel} size="sm">
      <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Category</h3>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category Name (e.g., Utility Bills)"
        className="w-full p-3 bg-gray-100 rounded-xl outline-none"
      />
      <div className="flex justify-end mt-6">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onSave(name)}>
          Save Category
        </Button>
      </div>
    </Modal>
  );
}

export default AddCategoryPopup;
