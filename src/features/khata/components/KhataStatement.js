"use client";

import { BRAND } from "@/constants/brand";
import { baqayaLabel, isPaid, overallBalance, payTypeOf, round2, workRefLabel } from "@/constants/wages";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

/**
 * A worker's printable khata (client, 2026-11-21: one print per worker — every cut he worked on, its operation,
 * pieces and rate, and his payment at the bottom). Inline styles with var(--color-*) like the gate pass, so it
 * prints the same everywhere; the print CSS keeps only `#khata-print` on the page.
 * `entries`: the lines to print (the caller picks "to pay" or all), oldest first here.
 */
const border = "1px solid var(--color-border-strong)";
const th = {
  border,
  padding: "5px 6px",
  fontSize: "11px",
  fontWeight: 700,
  textAlign: "left",
  background: "var(--color-surface-muted)",
};
const td = { border, padding: "5px 6px", fontSize: "11px", verticalAlign: "top" };
const num = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const totalRow = { ...num, fontWeight: 700, fontSize: "12px" };

const sumOf = (entries) => round2(entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));

export function KhataStatement({ worker, entries = [], title, advanceLeft = 0, baqaya = 0, printedAt = new Date() }) {
  const lines = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const total = sumOf(lines);
  const paid = sumOf(lines.filter(isPaid));
  const toPay = round2(total - paid);
  const pieces = lines.reduce((sum, e) => sum + (Math.trunc(Number(e.pieces)) || 0), 0);

  return (
    <div
      id="khata-print"
      className="bg-white mx-auto font-sans"
      style={{ width: "100%", maxWidth: "760px", padding: "18px", color: "var(--color-text-primary)" }}
      data-testid="khata-statement"
      data-lines={lines.length}
      data-total={total}
      data-to-pay={toPay}
    >
      <div style={{ textAlign: "center", borderBottom: "2px solid var(--color-primary)", paddingBottom: "8px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>{BRAND.name}</h1>
        <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", margin: 0 }}>
          Stitching khata
        </p>
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: "12px", margin: "10px 0", fontSize: "12px" }}
      >
        <div>
          <p style={{ fontSize: "16px", fontWeight: 800, margin: 0 }} data-testid="khata-statement-worker">
            {worker.name}
          </p>
          {worker.phone ? <p style={{ margin: 0 }}>{worker.phone}</p> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontWeight: 700, margin: 0 }}>{title}</p>
          <p style={{ margin: 0 }}>Printed {formatDateTime(printedAt)}</p>
        </div>
      </div>

      {lines.length === 0 ? (
        <p style={{ fontSize: "13px", padding: "16px 0", textAlign: "center" }}>No work to show.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Cut</th>
              <th style={th}>Operation</th>
              <th style={{ ...th, textAlign: "right" }}>Pieces</th>
              <th style={{ ...th, textAlign: "right" }}>Rate</th>
              <th style={{ ...th, textAlign: "right" }}>Amount</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((entry) => (
              <tr key={entry._id} data-testid="khata-statement-line">
                <td style={{ ...td, whiteSpace: "nowrap" }}>{formatDate(entry.date)}</td>
                <td style={td}>
                  {workRefLabel(entry) || "—"}
                  {entry.productName ? (
                    <span style={{ display: "block", color: "var(--color-text-secondary)" }}>{entry.productName}</span>
                  ) : null}
                </td>
                <td style={td}>{entry.operationName}</td>
                <td style={num}>{entry.pieces}</td>
                <td style={num}>{payTypeOf(entry) === "fixed" ? "Fixed" : formatMoney(entry.rate)}</td>
                <td style={num}>{formatMoney(entry.amount)}</td>
                <td style={td}>{isPaid(entry) ? "Paid" : "Unpaid"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...totalRow, textAlign: "left" }} colSpan={3}>
                Total · {lines.length} {lines.length === 1 ? "line" : "lines"}
              </td>
              <td style={totalRow}>{pieces}</td>
              <td style={totalRow} />
              <td style={totalRow}>{formatMoney(total)}</td>
              <td style={totalRow} />
            </tr>
          </tfoot>
        </table>
      )}

      <table style={{ marginLeft: "auto", marginTop: "12px", borderCollapse: "collapse", minWidth: "260px" }}>
        <tbody>
          <tr>
            <td style={td}>Total work</td>
            <td style={num}>{formatMoney(total)}</td>
          </tr>
          <tr>
            <td style={td}>Paid</td>
            <td style={num}>{formatMoney(paid)}</td>
          </tr>
          <tr>
            <td style={{ ...td, fontWeight: 800, fontSize: "13px" }}>To pay</td>
            <td style={{ ...num, fontWeight: 800, fontSize: "13px" }} data-testid="khata-statement-to-pay">
              {formatMoney(toPay)}
            </td>
          </tr>
          {baqaya !== 0 && (
            <tr>
              <td style={td}>Baqaya ({baqaya > 0 ? "still to give him" : "he has to give"})</td>
              <td style={num} data-testid="khata-statement-baqaya">
                {baqaya > 0 ? "+" : "−"} {formatMoney(Math.abs(baqaya))}
              </td>
            </tr>
          )}
          {advanceLeft > 0 && (
            <tr>
              <td style={td}>Advance left</td>
              <td style={num}>− {formatMoney(advanceLeft)}</td>
            </tr>
          )}
          {(baqaya !== 0 || advanceLeft > 0) && (
            <tr>
              <td style={{ ...td, fontWeight: 800, fontSize: "13px" }}>Overall</td>
              <td style={{ ...num, fontWeight: 800, fontSize: "13px" }} data-testid="khata-statement-overall">
                {baqayaLabel(overallBalance({ toPay, baqaya, advanceLeft }))}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36px", fontSize: "11px" }}>
        <span style={{ borderTop: border, paddingTop: "4px", minWidth: "160px", textAlign: "center" }}>
          Worker&apos;s signature
        </span>
        <span style={{ borderTop: border, paddingTop: "4px", minWidth: "160px", textAlign: "center" }}>
          Owner&apos;s signature
        </span>
      </div>
    </div>
  );
}

export default KhataStatement;
