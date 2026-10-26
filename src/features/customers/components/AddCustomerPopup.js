"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const EMPTY_CUSTOMER = { name: "", phone: "", city: "", openingBalance: 0 };

const FIELDS = [
  { name: "name", type: "text", placeholder: "Full Name" },
  { name: "phone", type: "tel", placeholder: "Phone Number" },
  { name: "city", type: "text", placeholder: "City" },
  { name: "openingBalance", type: "number", placeholder: "Opening Balance (Dues)" },
];

/** Register a customer. `onSave(customer)` resolves true when saved (the page then closes the popup). */
export function AddCustomerPopup({ onSave, onClose, initialData }) {
  const [customer, setCustomer] = useState({ ...EMPTY_CUSTOMER, ...initialData });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => setCustomer((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(customer);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} size="lg">
      <form noValidate onSubmit={handleSubmit}>
        <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Register Customer</h3>
        <div className="space-y-4">
          {FIELDS.map((field) => (
            <input
              autoComplete="off"
              key={field.name}
              type={field.type}
              name={field.name}
              value={customer[field.name]}
              onChange={handleChange}
              placeholder={field.placeholder}
              className="w-full p-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary"
            />
          ))}
        </div>
        <div className="flex justify-end mt-8">
          <Button type="submit" size="lg" className="rounded-xl" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddCustomerPopup;
