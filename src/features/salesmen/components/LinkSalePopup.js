"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";

/** Asks for an invoice number to assign to `salesmanName`. `onSave(invoiceNumber)` is awaited. */
export function LinkSalePopup({ salesmanName, onSave, onCancel }) {
  const toast = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!invoiceNumber) {
      toast.error("Please enter an invoice number.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(invoiceNumber);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal onClose={onCancel} size="sm">
      <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">Link Sale</h3>
      <p className="text-center text-gray-500 mb-6">for {salesmanName}</p>
      <div className="space-y-4">
        <input
          type="number"
          name="invoiceNumber"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          placeholder="Enter Invoice Number"
          className="w-full p-3 bg-gray-100 rounded-xl outline-none text-center text-lg"
        />
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" className="rounded-xl" onClick={handleSave} disabled={isSaving}>
          Link Sale
        </Button>
      </div>
    </Modal>
  );
}
