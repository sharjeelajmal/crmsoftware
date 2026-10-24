import { ObjectId } from "mongodb";
import { Parser } from "json2csv";
import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, parseQuery, notFound, escapeRegex } from "@/lib/api";
import { ledgerEntrySchema, ledgerQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { ledgerTotals, LEDGER_TYPE_LABELS } from "@/constants/ledger";
import { LEDGER_COLLECTION, buildLedgerEntry, ledgerCsvRows, resolveLotLink } from "@/lib/ledger";

const CSV_FIELDS = [
  { label: "Date", value: "date" },
  { label: "Type", value: (row) => LEDGER_TYPE_LABELS[row.type] ?? row.type },
  { label: "Item", value: "item" },
  { label: "Qty", value: "qty" },
  { label: "Unit", value: "unit" },
  { label: "Lot #", value: "lotNumber" },
  { label: "Note", value: "note" },
  { label: "Recorded by", value: "by" },
  { label: "Edits", value: "edits" },
];

/**
 * GET /api/ledger?type=bpair|accessory|fabric&search=&lotId=&filter=today|last7days|monthly|custom&from&to[&format=csv]
 * Admin only. Register entries (newest first) with per-type totals. Never touches products/stock.
 */
export const GET = route(async (request) => {
  const { type, search, lotId, filter = "all", from, to } = parseQuery(request, ledgerQuerySchema);
  const format = new URL(request.url).searchParams.get("format");
  // A half-filled custom range means "no period filter yet".
  const range =
    filter === "custom" && !(from && to) ? null : dateRangeFromFilter({ filter, from, to, monthlyMeans: "year" });

  const query = { ...dateQuery("createdAt", range) };
  if (type) query.type = type;
  if (lotId) query.lotId = new ObjectId(lotId);
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    query.$or = [{ item: pattern }, { note: pattern }, { lotNumber: pattern }];
  }

  const db = await getDb();
  const entries = await db.collection(LEDGER_COLLECTION).find(query).sort({ createdAt: -1 }).toArray();

  if (format === "csv") {
    const csv = new Parser({ fields: CSV_FIELDS }).parse(ledgerCsvRows(entries));
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger_${type || "all"}_${filter}.csv"`,
      },
    });
  }

  return ok({ entries, totals: ledgerTotals(entries), filter, from: range?.start ?? null, to: range?.end ?? null });
});

/** POST /api/ledger  { type, item, qty, unit?, note?, lotId? } — admin only. */
export const POST = route(async (request, { session }) => {
  const input = await parseBody(request, ledgerEntrySchema);
  const db = await getDb();
  const link = await resolveLotLink(db, input.lotId);
  if (!link) throw notFound("Lot");

  const doc = buildLedgerEntry({ input, link, session });
  const { insertedId } = await db.collection(LEDGER_COLLECTION).insertOne(doc);
  return created({ _id: insertedId, ...doc });
});
