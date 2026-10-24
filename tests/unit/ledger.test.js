import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LEDGER_TYPES, changedFields, filterLedgerEntries, ledgerTotals, shortfallEntryFor } from "@/constants/ledger";
import { buildLedgerEntry, ledgerEditOps, ledgerCsvRows } from "@/lib/ledger";
import { ledgerEntrySchema, ledgerEntryUpdateSchema, ledgerQuerySchema } from "@/lib/validation";

const session = { sub: "u1", name: "Admin", role: "admin" };

describe("ledger validation", () => {
  it("accepts a plain entry and fills the defaults", () => {
    const parsed = ledgerEntrySchema.parse({ type: "bpair", item: "Slim Fit Denim", qty: "3" });
    expect(parsed).toMatchObject({ type: "bpair", item: "Slim Fit Denim", qty: 3, unit: "pcs", note: "" });
  });

  it("rejects unknown types, zero quantity and a bad lot id", () => {
    expect(() => ledgerEntrySchema.parse({ type: "scrap", item: "x", qty: 1 })).toThrow();
    expect(() => ledgerEntrySchema.parse({ type: "fabric", item: "x", qty: 0 })).toThrow(/more than 0/);
    expect(() => ledgerEntrySchema.parse({ type: "fabric", item: "x", qty: 1, lotId: "nope" })).toThrow();
    expect(ledgerEntrySchema.parse({ type: "fabric", item: "x", qty: 1.5, lotId: null }).lotId).toBeNull();
  });

  it("update schema is partial and the query schema knows the type filter", () => {
    expect(ledgerEntryUpdateSchema.parse({ qty: "7" })).toEqual({ qty: 7 });
    expect(ledgerQuerySchema.parse({ type: "accessory", search: " zip " })).toMatchObject({
      type: "accessory",
      search: "zip",
    });
    expect(() => ledgerQuerySchema.parse({ type: "other" })).toThrow();
  });
});

describe("ledger rules", () => {
  const lot = {
    _id: "64b000000000000000000001",
    lotNumber: "LOT-1001",
    productName: "Slim Fit Denim",
    stage: "packing",
    cutQty: 120,
    stitchedQty: 118,
    washedQty: 117,
  };

  it("prefills a B-pair entry from a lot's shortfall", () => {
    expect(shortfallEntryFor(lot)).toEqual({
      type: "bpair",
      item: "Slim Fit Denim",
      qty: 3,
      unit: "pcs",
      note: "Shortfall of LOT-1001",
      lotId: "64b000000000000000000001",
      lotNumber: "LOT-1001",
    });
    expect(shortfallEntryFor({ ...lot, stitchedQty: null, washedQty: null })).toBeNull();
    expect(shortfallEntryFor({ ...lot, stitchedQty: 120, washedQty: 120 })).toBeNull();
    expect(shortfallEntryFor(null)).toBeNull();
  });

  const entries = [
    { type: "bpair", item: "Denim", qty: 3, note: "", lotNumber: "LOT-1001" },
    { type: "bpair", item: "Chino", qty: 2, note: "QC fail", lotNumber: null },
    { type: "accessory", item: "YKK Zip", qty: 40, note: "", lotNumber: null },
    { type: "fabric", item: "Denim 12oz", qty: 4.5, note: "leftover", lotNumber: "LOT-1002" },
  ];

  it("totals per type", () => {
    const totals = ledgerTotals(entries);
    expect(totals.count).toBe(4);
    expect(totals.byType.bpair).toEqual({ count: 2, qty: 5 });
    expect(totals.byType.accessory).toEqual({ count: 1, qty: 40 });
    expect(totals.byType.fabric).toEqual({ count: 1, qty: 4.5 });
    expect(Object.keys(ledgerTotals([]).byType)).toEqual([...LEDGER_TYPES]);
  });

  it("filters by type and searches item, note and lot number", () => {
    expect(filterLedgerEntries(entries, { type: "bpair" }).length).toBe(2);
    expect(filterLedgerEntries(entries, { type: "All" }).length).toBe(4);
    expect(filterLedgerEntries(entries, { search: "denim" }).map((e) => e.item)).toEqual(["Denim", "Denim 12oz"]);
    expect(filterLedgerEntries(entries, { search: "qc" })[0].item).toBe("Chino");
    expect(filterLedgerEntries(entries, { search: "lot-1002" })[0].type).toBe("fabric");
    expect(filterLedgerEntries(entries, { search: "zip", type: "fabric" }).length).toBe(0);
  });

  it("builds a new entry with the actor and an empty history", () => {
    const now = new Date("2026-10-21T10:00:00Z");
    const doc = buildLedgerEntry({
      input: { type: "accessory", item: "Buttons", qty: "12", unit: "dozen", note: "" },
      link: { lotId: null, lotNumber: null, lotProductName: null },
      session,
      now,
    });
    expect(doc).toMatchObject({
      type: "accessory",
      item: "Buttons",
      qty: 12,
      unit: "dozen",
      lotId: null,
      by: { id: "u1", name: "Admin" },
      history: [],
      createdAt: now,
    });
  });

  it("records what changed on every edit and skips no-op edits", () => {
    const existing = { type: "bpair", item: "Denim", qty: 3, unit: "pcs", note: "", lotNumber: "LOT-1001" };
    const now = new Date("2026-10-21T11:00:00Z");
    const ops = ledgerEditOps({
      existing,
      changes: { qty: 5, note: "recount", lotId: null },
      link: null,
      session,
      now,
    });
    expect(ops.$set).toEqual({ qty: 5, note: "recount", updatedAt: now });
    expect(ops.$push.history).toEqual({
      at: now,
      by: { id: "u1", name: "Admin" },
      before: { qty: 3, note: "" },
      after: { qty: 5, note: "recount" },
    });
    expect(changedFields(existing, { ...existing, lotNumber: null })).toEqual(["lotNumber"]);
    expect(ledgerEditOps({ existing, changes: { qty: "3" }, session, now })).toBeNull();

    const unlinked = ledgerEditOps({
      existing,
      changes: { lotId: null },
      link: { lotId: null, lotNumber: null, lotProductName: null },
      session,
      now,
    });
    expect(unlinked.$set.lotNumber).toBeNull();
    expect(unlinked.$push.history.before).toEqual({ lotNumber: "LOT-1001" });
  });

  it("flattens entries for the CSV export", () => {
    const [row] = ledgerCsvRows([
      { ...entries[0], unit: "pcs", createdAt: new Date(), by: { name: "Admin" }, history: [{}, {}] },
    ]);
    expect(row).toMatchObject({ type: "bpair", item: "Denim", qty: 3, lotNumber: "LOT-1001", by: "Admin", edits: 2 });
  });
});

describe("ledger never touches stock", () => {
  // The register is a standalone notebook: no code path from it may reach products or stock.
  const root = path.resolve(__dirname, "..", "..");
  const files = [
    "src/constants/ledger.js",
    "src/lib/ledger.js",
    "src/app/api/ledger/route.js",
    "src/app/api/ledger/[id]/route.js",
  ];
  const forbidden = /inventory|production|stock_movements|addStock|deductStock|restoreStock|collection\("products"\)/;

  it.each(files)("%s has no stock or product access", (file) => {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(forbidden);
  });
});
