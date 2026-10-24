"use client";

import { BRAND, BUSINESS } from "@/constants/brand";
import { GATE_PASS_LABELS, formatShrinkage } from "@/constants/gatepass";
import { formatDateTime } from "@/lib/format";

/**
 * The printable gate pass (screen preview and print). Inline styles with var(--color-*) like the invoice,
 * so it prints the same everywhere. Phone numbers: one on top, one at the bottom (client's instruction).
 */

const border = "1px solid var(--color-border-strong)";
const cell = { border, padding: "6px 10px", fontSize: "13px" };
const labelCell = { ...cell, fontWeight: 600, width: "38%", background: "var(--color-surface-muted)" };
const phoneStyle = { fontSize: "20px", fontWeight: 700, letterSpacing: "1px", color: "var(--color-primary)" };

function Row({ label, value, testId }) {
  return (
    <tr>
      <td style={labelCell}>{label}</td>
      <td style={cell} data-testid={testId}>
        {value}
      </td>
    </tr>
  );
}

export function GatePassDocument({ pass, id = "gate-pass-print" }) {
  if (!pass) return null;
  const isWashing = pass.type === "washing";
  const sizes = (pass.sizes || []).filter((row) => row.qty > 0);

  return (
    <div
      id={id}
      className="bg-white mx-auto font-sans"
      style={{ width: "100%", maxWidth: "640px", padding: "20px", color: "var(--color-text-primary)" }}
      data-testid="gate-pass-document"
      data-number={pass.number}
      data-type={pass.type}
    >
      <div style={{ textAlign: "center", borderBottom: "2px solid var(--color-primary)", paddingBottom: "10px" }}>
        <p style={phoneStyle} data-testid="gate-pass-phone-top">
          {BUSINESS.gatePass.phoneTop}
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "4px 0 0" }}>{BRAND.name}</h1>
        <p style={{ fontSize: "15px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px" }}>
          {GATE_PASS_LABELS[pass.type] || "Gate pass"}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0", fontSize: "13px" }}>
        <span>
          <strong>No.</strong> {pass.number}
        </span>
        <span>
          <strong>Date</strong> {formatDateTime(pass.issuedAt)}
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row label="Cut / Lot no." value={pass.lotNumber} testId="gate-pass-lot" />
          <Row label="Article" value={pass.productName || "—"} />
          {isWashing ? (
            <>
              <Row label="Pieces" value={`${pass.pieces} pcs`} testId="gate-pass-pieces" />
              <Row label="Wash" value={pass.washType || "—"} testId="gate-pass-wash" />
            </>
          ) : (
            <>
              <Row label="Bundle no." value={pass.bundleNumber || "—"} testId="gate-pass-bundle" />
              <Row label="Sizes" value={pass.sizeRange || "—"} testId="gate-pass-sizes" />
              <Row label="Total pieces" value={`${pass.pieces} pcs`} testId="gate-pass-pieces" />
              <Row label="Shrinkage" value={formatShrinkage(pass.shrinkage)} testId="gate-pass-shrinkage" />
              {pass.fabric?.name ? (
                <Row label="Fabric" value={`${pass.fabric.name} · ${pass.fabric.qty} ${pass.fabric.unit}`} />
              ) : null}
            </>
          )}
        </tbody>
      </table>

      {!isWashing && sizes.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
          <thead>
            <tr>
              {sizes.map((row) => (
                <th key={row.size} style={{ ...cell, background: "var(--color-surface-muted)", textAlign: "center" }}>
                  {row.size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {sizes.map((row) => (
                <td key={row.size} style={{ ...cell, textAlign: "center" }}>
                  {row.qty}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {isWashing && (
        <p style={{ marginTop: "12px", fontSize: "13px" }}>
          {pass.pieces} pieces of {pass.lotNumber} ({pass.productName}) sent for {pass.washType || "washing"}.
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px" }}>
        <span style={{ borderTop: border, paddingTop: "4px", width: "40%", textAlign: "center" }}>
          Issued by {pass.issuedBy?.name ? `· ${pass.issuedBy.name}` : ""}
        </span>
        <span style={{ borderTop: border, paddingTop: "4px", width: "40%", textAlign: "center" }}>Received by</span>
      </div>

      <p
        style={{
          ...phoneStyle,
          textAlign: "center",
          marginTop: "24px",
          borderTop: "2px solid var(--color-primary)",
          paddingTop: "10px",
        }}
        data-testid="gate-pass-phone-bottom"
      >
        {BUSINESS.gatePass.phoneBottom}
      </p>
    </div>
  );
}

export default GatePassDocument;
