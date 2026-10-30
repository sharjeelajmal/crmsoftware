import { Parser } from "json2csv";
import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { periodQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { STAGES, STAGE_LABELS, lotShortfall } from "@/lib/lots";

/**
 * GET /api/lots/report?filter=today|last7days|monthly|custom&from&to[&format=csv]
 * Admin only. Lots created in the period: stage-wise totals plus the detailed list.
 * ("monthly" means "this year" here, like analytics; default = all time.)
 */
export const GET = route(async (request) => {
  const { filter = "all", from, to } = parseQuery(request, periodQuerySchema);
  const format = new URL(request.url).searchParams.get("format");
  const range = dateRangeFromFilter({ filter, from, to, monthlyMeans: "year" });

  const db = await getDb();
  const lots = await db.collection("lots").find(dateQuery("createdAt", range)).sort({ createdAt: -1 }).toArray();

  const byStage = Object.fromEntries(
    STAGES.map((s) => [s, { count: 0, cutQty: 0, stitchedQty: 0, washedQty: 0, readyQty: 0 }])
  );
  for (const lot of lots) {
    const bucket =
      byStage[lot.stage] ?? (byStage[lot.stage] = { count: 0, cutQty: 0, stitchedQty: 0, washedQty: 0, readyQty: 0 });
    bucket.count += 1;
    bucket.cutQty += Number(lot.cutQty) || 0;
    bucket.stitchedQty += Number(lot.stitchedQty) || 0;
    bucket.washedQty += Number(lot.washedQty) || 0;
    bucket.readyQty += Number(lot.readyQty) || 0;
  }

  const rows = lots.map((lot) => {
    const shortfall = lotShortfall(lot);
    return {
      lotNumber: lot.lotNumber,
      product: lot.productName,
      stage: STAGE_LABELS[lot.stage] ?? lot.stage,
      cutQty: lot.cutQty,
      stitchedQty: lot.stitchedQty ?? "",
      washedQty: lot.washedQty ?? "",
      readyQty: lot.readyQty ?? "",
      stockApplied: lot.stockApplied ? "yes" : "",
      shortfall: shortfall.total ?? "",
      createdBy: lot.createdBy?.name ?? "",
      createdAt: new Date(lot.createdAt).toLocaleString(),
      updatedAt: new Date(lot.updatedAt).toLocaleString(),
    };
  });

  if (format === "csv") {
    const csv = new Parser({
      fields: [
        { label: "Invoice #", value: "lotNumber" },
        { label: "Article", value: "product" },
        { label: "Stage", value: "stage" },
        { label: "Cut", value: "cutQty" },
        { label: "Stitched", value: "stitchedQty" },
        { label: "Washed", value: "washedQty" },
        { label: "Ready", value: "readyQty" },
        { label: "In stock", value: "stockApplied" },
        { label: "Shortfall", value: "shortfall" },
        { label: "Created by", value: "createdBy" },
        { label: "Created", value: "createdAt" },
        { label: "Updated", value: "updatedAt" },
      ],
    }).parse(rows);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoice_report_${filter}.csv"`,
      },
    });
  }

  const totals = {
    count: lots.length,
    cutQty: lots.reduce((s, l) => s + (Number(l.cutQty) || 0), 0),
    stitchedQty: lots.reduce((s, l) => s + (Number(l.stitchedQty) || 0), 0),
    washedQty: lots.reduce((s, l) => s + (Number(l.washedQty) || 0), 0),
    readyQty: lots.reduce((s, l) => s + (Number(l.readyQty) || 0), 0),
  };

  return ok({ filter, from: range?.start ?? null, to: range?.end ?? null, totals, byStage, lots: rows });
});
