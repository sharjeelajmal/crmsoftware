"use client";

import Image from "next/image";
import { PlusCircle } from "lucide-react";
import { BRAND, BUSINESS } from "@/constants/brand";
import { padInvoiceNumber } from "@/lib/format";
import { useNow } from "../hooks/useNow";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceTotals } from "./InvoiceTotals";
import { PaymentDetails } from "./PaymentDetails";

/**
 * The editable on-screen invoice (`#invoice-section` is what the print CSS keeps visible).
 * `form` is the object returned by `useInvoiceForm`; `actions` renders inside the no-print bar.
 */
export function InvoiceEditor({ invoiceNumber, form, actions }) {
  const now = useNow();

  return (
    <div id="invoice-section" className="bg-white max-w-4xl mx-auto font-sans">
      <header className="p-8 bg-surface-muted">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-wider">INVOICE</h1>
            <p className="font-medium mt-2 text-sm">Invoice No. {padInvoiceNumber(invoiceNumber)}</p>
            <p className="text-xs font-medium">{now ? now.toLocaleDateString() : ""}</p>
            <p className="text-xs font-medium">{now ? now.toLocaleTimeString() : ""}</p>
          </div>
          <div className="text-right">
            <div className="flex justify-end items-center">
              <Image src={BRAND.logo} alt={`${BRAND.name} Logo`} width={50} height={50} />
              <h2 className="text-2xl font-bold ml-3 text-primary">{BRAND.name}</h2>
            </div>
            <p className="text-xs mt-2">
              {BUSINESS.addressLines.map((line, i) => (
                <span key={line}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
            {BUSINESS.contacts.map((contact, i) => (
              <p key={contact.phone} className={`text-xs font-semibold ${i === 0 ? "mt-1" : ""}`}>
                {contact.name}: {contact.phone}
              </p>
            ))}
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="w-full flex justify-end mb-4">
          <div className="w-1/3">
            <h3 className="text-md font-semibold pb-1 mb-1 text-right">Customer Details</h3>
            <input
              type="text"
              placeholder="Enter Name"
              value={form.customer.name}
              onChange={(e) => form.updateCustomer("name", e.target.value)}
              className="text-sm font-medium w-full p-1 text-right outline-none bg-transparent placeholder:text-gray-400"
            />
            <input
              type="text"
              placeholder="Enter Phone"
              value={form.customer.phone}
              onChange={(e) => form.updateCustomer("phone", e.target.value)}
              className="text-xs w-full p-1 text-right outline-none bg-transparent placeholder:text-gray-400"
            />
          </div>
        </div>

        <InvoiceItemsTable
          items={form.items}
          products={form.products}
          suggestions={form.suggestions}
          onItemChange={form.updateItem}
          onPickProduct={form.pickProduct}
        />
        <div className="flex justify-start mt-2 mb-4 no-print">
          <button
            type="button"
            onClick={form.addRow}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            <PlusCircle size={18} /> Add New Row
          </button>
        </div>

        <InvoiceTotals totals={form.totals} charges={form.charges} onChargeChange={form.updateCharge} />
      </div>

      <footer className="bg-surface-muted">
        <div className="p-8">
          <PaymentDetails />
          <div className="flex justify-between items-center no-print">{actions}</div>
        </div>
      </footer>
    </div>
  );
}

export default InvoiceEditor;
