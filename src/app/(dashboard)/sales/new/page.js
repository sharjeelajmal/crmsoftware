"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api-client";
import { useInvoicePdf } from "@/hooks/useInvoicePdf";
import { useNewInvoice } from "@/features/sales/hooks/useNewInvoice";
import { useInvoiceForm } from "@/features/sales/hooks/useInvoiceForm";
import { InvoiceEditor } from "@/features/sales/components/InvoiceEditor";
import { SaveConfirmationPopup } from "@/features/sales/components/SaveConfirmationPopup";

const ACTION_BUTTON =
  "flex items-center text-white font-semibold py-2 px-5 rounded-lg transition-opacity hover:opacity-90 text-sm bg-primary " +
  "cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

export default function NewInvoicePage() {
  const toast = useToast();
  const { products, invoiceNumber, setNextInvoiceNumber, saveSale } = useNewInvoice();
  const form = useInvoiceForm(products);
  const { downloadInvoicePdf, isGenerating } = useInvoicePdf();
  const [savedSale, setSavedSale] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const problem = form.validate();
    if (problem) {
      toast.info(problem);
      return;
    }
    setIsSaving(true);
    // Server may hand back a different invoiceNumber if ours was taken meanwhile.
    const saved = await saveSale(form.buildSale(invoiceNumber));
    setIsSaving(false);
    if (!saved) return;
    setSavedSale(saved);
    try {
      await downloadInvoicePdf(saved);
    } catch (err) {
      toast.error(errorMessage(err, "Could not generate the PDF"));
    }
  };

  const closePopupAndReset = () => {
    setNextInvoiceNumber(savedSale.invoiceNumber + 1);
    setSavedSale(null);
    form.reset();
  };

  const busy = isSaving || isGenerating;

  return (
    <>
      <AnimatePresence>
        {savedSale && <SaveConfirmationPopup invoiceNumber={savedSale.invoiceNumber} onClose={closePopupAndReset} />}
      </AnimatePresence>

      <InvoiceEditor
        invoiceNumber={invoiceNumber}
        form={form}
        actions={
          <>
            <Link href="/sales" className="flex items-center font-semibold text-sm text-text-secondary">
              <ArrowLeft size={16} className="mr-2" /> Back to Sales
            </Link>
            <div className="flex gap-4">
              <button type="button" onClick={handleSave} disabled={busy} className={ACTION_BUTTON}>
                <Save size={16} className="mr-2" /> {busy ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => window.print()} className={ACTION_BUTTON}>
                <Printer size={16} className="mr-2" /> Print
              </button>
            </div>
          </>
        }
      />
    </>
  );
}
