import { getDb } from "@/lib/mongodb";
import { route, ok } from "@/lib/api";
import { fetchAllCustomerBalances } from "@/lib/balances";

/** Customers who owe money, biggest debtor first, plus summary stats. */
export const GET = route(async () => {
  const db = await getDb();
  const debtors = (await fetchAllCustomerBalances(db))
    .filter((c) => c.totalBalance > 0)
    .sort((a, b) => b.totalBalance - a.totalBalance);

  return ok({
    customers: debtors,
    stats: {
      totalDues: debtors.reduce((sum, c) => sum + c.totalBalance, 0),
      totalCustomersWithDues: debtors.length,
      topDebtorName: debtors[0]?.name ?? "N/A",
    },
  });
});
