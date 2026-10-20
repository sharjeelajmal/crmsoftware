"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { useAsyncData } from "@/hooks/useAsyncData";
import { Loader } from "@/components/ui/Loader";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";

export default function ViewSalePage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    data: sale,
    isLoading,
    error,
  } = useAsyncData(() => api.get(`/api/sales/${id}`), [id], { enabled: Boolean(id), cacheKey: `sale:${id}` });

  if (isLoading) return <Loader />;

  return (
    <div>
      {sale ? (
        <div id="invoice-section">
          <InvoiceDocument sale={sale} forPDF />
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {error ? errorMessage(error, "Sale not found") : "Sale not found."}
        </p>
      )}
      <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto no-print">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center font-semibold text-sm cursor-pointer text-text-secondary"
        >
          <ArrowLeft size={16} className="mr-2" /> Back to Sales
        </button>
        {sale && (
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center text-white font-semibold py-2 px-5 rounded-lg text-sm cursor-pointer bg-primary"
          >
            <Printer size={16} className="mr-2" /> Print
          </button>
        )}
      </div>
    </div>
  );
}
