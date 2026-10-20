import { subDays, differenceInDays, addDays, format, getYear, startOfDay, endOfDay } from "date-fns";
import { BUSINESS } from "@/constants/brand";
import { saleProfit, saleRevenue } from "@/lib/sales";

/**
 * Chart series builders for /api/analytics. Each returns
 * `{ chartLabel, chartData: [{ name, total, profit }] }` for the given sales.
 */

const emptyBuckets = (labels) => labels.map((name) => ({ name, total: 0, profit: 0 }));

function fill(buckets, sales, bucketIndexOf, purchasePrices) {
  for (const sale of sales) {
    const index = bucketIndexOf(sale);
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].total += saleRevenue(sale);
    buckets[index].profit += saleProfit(sale, purchasePrices);
  }
  return buckets;
}

const localHour = (date) => (new Date(date).getUTCHours() + BUSINESS.timezoneOffsetHours) % 24;

export function buildChart({ filter, sales, purchasePrices, start, end, now = new Date() }) {
  switch (filter) {
    case "today":
      return {
        chartLabel: "Today's Overview (by Hour)",
        chartData: fill(
          emptyBuckets(Array.from({ length: 24 }, (_, i) => `${i}:00`)),
          sales,
          (sale) => localHour(sale.invoiceDate),
          purchasePrices
        ),
      };
    case "last7days": {
      const labels = Array.from({ length: 7 }, (_, i) =>
        subDays(now, 6 - i).toLocaleDateString("en-US", { weekday: "short" })
      );
      const dayIndex = (sale) => 6 - Math.floor((endOfDay(now) - startOfDay(new Date(sale.invoiceDate))) / 86_400_000);
      return {
        chartLabel: "Last 7 Days Overview",
        chartData: fill(emptyBuckets(labels), sales, dayIndex, purchasePrices),
      };
    }
    case "custom": {
      const days = differenceInDays(end, start) + 1;
      const labels = Array.from({ length: days }, (_, i) => format(addDays(start, i), "MMM d"));
      return {
        chartLabel: `Custom Range Overview (${format(start, "MMM d")} - ${format(end, "MMM d")})`,
        chartData: fill(
          emptyBuckets(labels),
          sales,
          (sale) => differenceInDays(new Date(sale.invoiceDate), start),
          purchasePrices
        ),
      };
    }
    default: {
      const labels = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString("en-US", { month: "short" }));
      return {
        chartLabel: `Overview (${getYear(now)})`,
        chartData: fill(emptyBuckets(labels), sales, (sale) => new Date(sale.invoiceDate).getMonth(), purchasePrices),
      };
    }
  }
}

/** Top N products by quantity sold in the given sales. */
export function topSellingProducts(sales, limit = 5) {
  const totals = new Map();
  for (const sale of sales) {
    for (const item of sale.items || []) {
      if (!item.desc) continue;
      totals.set(item.desc, (totals.get(item.desc) || 0) + (parseInt(item.qty, 10) || 0));
    }
  }
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, totalSold]) => ({ name, totalSold }));
}
