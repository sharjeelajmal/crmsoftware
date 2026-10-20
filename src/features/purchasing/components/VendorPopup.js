"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EMPTY_VENDOR } from "../utils";

const INPUT_CLASS = "w-full p-3 bg-gray-100 rounded-xl outline-none";

/** Add or edit a vendor. `initialData` (with `_id`) switches the popup to edit mode. */
export function VendorPopup({ initialData, onSave, onCancel }) {
  const [vendor, setVendor] = useState(initialData || EMPTY_VENDOR);
  const isEditing = Boolean(initialData);

  const handleChange = (e) => setVendor((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <Modal onClose={onCancel} size="md">
      <h3 className="text-2xl font-bold mb-6 text-center">{isEditing ? "Edit Vendor" : "Add New Vendor"}</h3>
      <div className="space-y-4">
        <input
          type="text"
          name="name"
          value={vendor.name}
          onChange={handleChange}
          placeholder="Vendor Company Name"
          className={INPUT_CLASS}
        />
        <input
          type="text"
          name="contactPerson"
          value={vendor.contactPerson}
          onChange={handleChange}
          placeholder="Contact Person"
          className={INPUT_CLASS}
        />
        <input
          type="tel"
          name="phone"
          value={vendor.phone}
          onChange={handleChange}
          placeholder="Phone Number"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onSave(vendor)}>
          {isEditing ? "Save Changes" : "Save Vendor"}
        </Button>
      </div>
    </Modal>
  );
}

export default VendorPopup;
