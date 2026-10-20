"use client";

import { BRAND, BUSINESS } from "@/constants/brand";
import { padInvoiceNumber } from "@/lib/format";

/**
 * The one invoice layout used everywhere: on-screen preview, PDF export and print.
 * Fixed A4-ish box with inline styles because html2canvas does not reliably
 * resolve Tailwind utilities. Colors still come from globals.css via var().
 *
 * `sale` shape (same as the `sales` collection document):
 *   invoiceNumber, invoiceDate, customerName, customerPhone,
 *   items[{ desc, qty, price }], subTotal, others, discount, total, receivedAmount, balance
 */

const secondary = { color: "var(--color-text-secondary)" };
const cell = { border: "1px solid var(--color-border)", padding: "6px" };
const centerCell = { ...cell, textAlign: "center" };
const label = { fontWeight: "600", paddingRight: "16px" };

const toDate = (value) => (value instanceof Date ? value : new Date(value));
const lineAmount = (item) => (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);

export function InvoiceDocument({ sale, forPDF = false, id = "invoice-pdf-content" }) {
  if (!sale) return null;

  const date = toDate(sale.invoiceDate ?? Date.now());
  const items = (sale.items || []).filter((item) => item.desc);
  const subTotal = Number(sale.subTotal) || 0;
  const total = Number(sale.total ?? subTotal) || 0;

  return (
    <div
      id={id}
      className={`bg-white max-w-4xl mx-auto font-sans transform ${forPDF ? "" : "scale-[0.8] origin-top"}`}
      style={{ color: "var(--color-text-primary)" }}
    >
      <div
        style={{
          position: "relative",
          width: "820px",
          height: "1160px",
          backgroundColor: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div>
          <header style={{ backgroundColor: "var(--color-surface-muted)", padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: "2.25rem", fontWeight: "bold" }}>INVOICE</h1>
                <p style={{ marginTop: "8px", ...secondary }}>Invoice No. {padInvoiceNumber(sale.invoiceNumber)}</p>
                <p style={{ fontSize: "0.75rem", ...secondary }}>{date.toLocaleDateString()}</p>
                <p style={{ fontSize: "0.75rem", ...secondary }}>{date.toLocaleTimeString()}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "8px" }}>
                  {/* Plain <img>: this tree is also rendered off-screen for html2canvas, where next/image adds nothing. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={BRAND.logo}
                    alt={`${BRAND.name} Logo`}
                    width={50}
                    height={50}
                    style={{ borderRadius: "9999px" }}
                  />
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "var(--color-primary)",
                      marginLeft: "12px",
                    }}
                  >
                    {BRAND.name}
                  </h2>
                </div>
                <p style={{ fontSize: "0.75rem", ...secondary }}>
                  {BUSINESS.addressLines.map((line, i) => (
                    <span key={line}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
                {BUSINESS.contacts.map((contact, i) => (
                  <p
                    key={contact.phone}
                    style={{ fontSize: "0.75rem", fontWeight: "600", marginTop: i === 0 ? "4px" : 0, ...secondary }}
                  >
                    {contact.name}: {contact.phone}
                  </p>
                ))}
              </div>
            </div>
          </header>

          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <div style={{ width: "33.33%" }}>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    paddingBottom: "4px",
                    marginBottom: "4px",
                    textAlign: "right",
                  }}
                >
                  Customer Details
                </h3>
                <p style={{ textAlign: "right", fontWeight: "500" }}>{sale.customerName}</p>
                <p style={{ textAlign: "right", fontSize: "0.875rem", ...secondary }}>{sale.customerPhone}</p>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
                  <th style={{ textAlign: "left", padding: "8px" }}>Description</th>
                  <th style={{ padding: "8px" }}>QTY</th>
                  <th style={{ padding: "8px" }}>Price</th>
                  <th style={{ padding: "8px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={index}>
                      <td style={cell}>
                        {item.desc}
                        {item.size ? ` (Size ${item.size})` : ""}
                      </td>
                      <td style={centerCell}>{item.qty}</td>
                      <td style={centerCell}>{item.price}</td>
                      <td style={centerCell}>{lineAmount(item).toFixed(0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ ...cell, textAlign: "center", padding: "16px" }}>
                      Linked Sale - Full item details not available here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <table style={{ width: "250px", fontSize: "0.875rem" }}>
                <tbody>
                  <tr>
                    <td style={label}>Sub Total:</td>
                    <td style={{ textAlign: "right" }}>{subTotal.toFixed(0)}</td>
                  </tr>
                  <tr>
                    <td style={label}>Others:</td>
                    <td style={{ textAlign: "right" }}>{sale.others || 0}</td>
                  </tr>
                  <tr>
                    <td style={label}>Discount:</td>
                    <td style={{ textAlign: "right" }}>{sale.discount || 0}</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", fontSize: "1.125rem" }}>
                    <td style={{ paddingTop: "8px", paddingRight: "16px" }}>Total:</td>
                    <td style={{ paddingTop: "8px", textAlign: "right" }}>{total.toFixed(0)}</td>
                  </tr>
                  <tr>
                    <td style={{ ...label, paddingTop: "8px" }}>Received:</td>
                    <td style={{ textAlign: "right", paddingTop: "8px" }}>{sale.receivedAmount || 0}</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", fontSize: "1.25rem", color: "var(--color-danger)" }}>
                    <td style={{ paddingTop: "8px", paddingRight: "16px" }}>Balance:</td>
                    <td style={{ paddingTop: "8px", textAlign: "right" }}>{(Number(sale.balance) || 0).toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            backgroundColor: "var(--color-surface-muted)",
            padding: "32px",
          }}
        >
          <div style={{ borderTop: "2px solid var(--color-border-strong)", paddingTop: "24px" }}>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", textAlign: "left", marginBottom: "12px" }}>
                Payment Details
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", fontSize: "0.75rem" }}>
                {BUSINESS.bankAccounts.map((account) => (
                  <div key={account.accountNumber}>
                    <p>
                      <span style={{ fontWeight: "600" }}>Bank Name:</span> {account.bank}
                    </p>
                    <p>
                      <span style={{ fontWeight: "600" }}>Account Name:</span> {account.accountName}
                    </p>
                    <p>
                      <span style={{ fontWeight: "600" }}>Account Number:</span> {account.accountNumber}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                fontSize: "1rem",
                color: "white",
                padding: "8px",
                borderRadius: "8px",
                backgroundColor: "var(--color-primary)",
                fontFamily: "var(--font-urdu)",
              }}
            >
              {BUSINESS.invoiceNoteUrdu}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
