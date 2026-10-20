import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { periodQuerySchema } from "@/lib/validation";
import { dateRangeFromFilter, dateQuery } from "@/lib/dates";
import { totalOutstandingDues } from "@/lib/balances";
import { saleProfit, saleRevenue } from "@/lib/sales";
import { buildChart, topSellingProducts } from "@/lib/analytics";

/**
 * GET /api/analytics?filter=today|last7days|monthly|custom&from&to
 * ("monthly" has always meant "this year" on this endpoint.)
 */
export const GET = route(async (request) => {
  const { filter = "today", from, to } = parseQuery(request, periodQuerySchema);
  const range = dateRangeFromFilter({ filter, from, to, monthlyMeans: "year" });
  const db = await getDb();

  const [products, salesInPeriod, purchasesInPeriod, totalCustomers, recentSales, totalDues] = await Promise.all([
    db
      .collection("products")
      .find({}, { projection: { name: 1, purchasePrice: 1 } })
      .toArray(),
    db.collection("sales").find(dateQuery("invoiceDate", range)).toArray(),
    db
      .collection("purchases")
      .find(dateQuery("purchaseDate", range), { projection: { totalCost: 1 } })
      .toArray(),
    db.collection("customers").countDocuments(),
    db.collection("sales").find({}).sort({ invoiceDate: -1 }).limit(5).toArray(),
    totalOutstandingDues(db),
  ]);

  const purchasePrices = new Map(products.map((p) => [p.name, Number(p.purchasePrice) || 0]));
  const totalRevenue = salesInPeriod.reduce((sum, sale) => sum + saleRevenue(sale), 0);
  const totalProfit = salesInPeriod.reduce((sum, sale) => sum + saleProfit(sale, purchasePrices), 0);
  const totalSales = salesInPeriod.length;
  const totalPurchaseValue = purchasesInPeriod.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);

  return ok({
    totalRevenue,
    totalSales,
    totalProfit,
    avgSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    totalCustomers,
    ...buildChart({ filter, sales: salesInPeriod, purchasePrices, start: range?.start, end: range?.end }),
    topSellingProducts: topSellingProducts(salesInPeriod),
    recentSales,
    totalPurchaseValue,
    recoveryData: { totalDues, percentage: 0 },
  });
});
