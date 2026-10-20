"use client";

import { CheckCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { padInvoiceNumber } from "@/lib/format";

/** Shown after a sale is saved; `invoiceNumber` is the one the server actually assigned. */
export function SaveConfirmationPopup({ invoiceNumber, onClose }) {
  return (
    <Modal onClose={onClose} size="sm">
      <div className="text-center">
        <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-800">Saved Successfully!</h3>
        <p className="text-gray-600 mt-2">Invoice #__{padInvoiceNumber(invoiceNumber)}__ has been saved.</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-3 bg-primary text-white rounded-xl font-semibold transform hover:scale-105 transition-transform
            cursor-pointer"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export default SaveConfirmationPopup;
