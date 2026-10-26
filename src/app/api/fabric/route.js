import { getDb } from "@/lib/mongodb";
import { route, ok, parseQuery } from "@/lib/api";
import { fabricQuerySchema } from "@/lib/validation";
import { isAdmin } from "@/lib/lots";
import { dayEnd, dayStart } from "@/lib/purchasingLedger";
import { fabricHolders, fabricScope, loadFabricData } from "@/lib/fabric";
import { fabricBalances, fabricDayLedger, fabricKey, fabricMovements, totalsByUnit } from "@/constants/fabric";
import { ALL_ROLES } from "@/constants/roles";

/**
 * GET /api/fabric?holderId=&fabric=<key>&from=yyyy-mm-dd&to=yyyy-mm-dd — the fabric khata.
 * All-time balance of every fabric (received / used / in hand) and per unit, the day-by-day khata for the period
 * (one fabric or all), and the receipts of the period, newest first. `admin` tells the page to offer the cutting
 * masters filter (`holders`).
 */
export const GET = route(
  async (request, { session }) => {
    const { holderId, fabric = "", from, to } = parseQuery(request, fabricQuerySchema);
    const db = await getDb();
    const [{ receipts, lots }, holders] = await Promise.all([
      loadFabricData(db, fabricScope(session, holderId)),
      isAdmin(session) ? fabricHolders(db) : [],
    ]);

    const movements = fabricMovements({ receipts, lots });
    const balances = fabricBalances(movements);
    const fromAt = dayStart(from);
    const toAt = dayEnd(to);
    const inPeriod = receipts
      .filter(
        (receipt) =>
          (!fromAt || receipt.date >= fromAt) &&
          (!toAt || receipt.date <= toAt) &&
          (!fabric || fabricKey(receipt.name, receipt.unit) === fabric)
      )
      .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);

    return ok({
      balances,
      totals: totalsByUnit(balances),
      ledger: fabricDayLedger(movements, { key: fabric, from: fromAt, to: toAt }),
      receipts: inPeriod,
      admin: isAdmin(session),
      holders,
    });
  },
  { roles: ALL_ROLES }
);
