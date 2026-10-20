"use client";

import { useCallback, useState } from "react";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { elementToPdf, renderOffscreen } from "@/lib/pdf";

/**
 * const { downloadInvoicePdf, isGenerating } = useInvoicePdf();
 * await downloadInvoicePdf(sale);
 */
export function useInvoicePdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadInvoicePdf = useCallback(async (sale) => {
    if (!sale) return;
    setIsGenerating(true);
    try {
      await renderOffscreen(<InvoiceDocument sale={sale} forPDF />, (container) =>
        elementToPdf(container.querySelector("#invoice-pdf-content"), `invoice-${sale.invoiceNumber}.pdf`)
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { downloadInvoicePdf, isGenerating };
}
