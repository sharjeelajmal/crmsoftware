/**
 * Customer balance logic shared by customers, recovery, analytics and sales/adjust.
 *
 * A "registered" customer lives in the `customers` collection and may have an
 * `openingBalance`. A "normal" customer only exists through their sales.
 * Both are identified by name + phone.
 */

export const customerKey = (name = "", phone = "") => `${String(name).trim()}-${String(phone).trim()}`;

/** Aggregation stages that attach sales totals to each registered customer. */
export const registeredCustomerSalesPipeline = [
  {
    $lookup: {
      from: "sales",
      let: { customerName: "$name", customerPhone: "$phone" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ["$customerName", "$$customerName"] }, { $eq: ["$customerPhone", "$$customerPhone"] }],
            },
          },
        },
      ],
      as: "salesData",
    },
  },
  {
    $addFields: {
      totalPurchases: { $size: "$salesData" },
      amountSpent: { $sum: "$salesData.subTotal" },
      salesBalance: { $sum: "$salesData.balance" },
      lastPurchaseDate: { $max: "$salesData.invoiceDate" },
    },
  },
  {
    $addFields: {
      totalBalance: { $add: [{ $ifNull: ["$openingBalance", 0] }, { $ifNull: ["$salesBalance", 0] }] },
    },
  },
  { $project: { salesData: 0 } },
];

/** Registered customers with totals, sorted by name. */
export function fetchRegisteredCustomers(db) {
  return db
    .collection("customers")
    .aggregate([...registeredCustomerSalesPipeline, { $sort: { name: 1 } }])
    .toArray();
}

/** Customers that only exist in sales (not in the customers collection). */
export async function fetchNormalCustomers(db, registeredKeys) {
  const grouped = await db
    .collection("sales")
    .aggregate([
      {
        $group: {
          _id: { name: "$customerName", phone: "$customerPhone" },
          totalPurchases: { $sum: 1 },
          amountSpent: { $sum: "$subTotal" },
          totalBalance: { $sum: "$balance" },
          lastPurchaseDate: { $max: "$invoiceDate" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          phone: "$_id.phone",
          isNormal: { $literal: true },
          totalPurchases: 1,
          amountSpent: 1,
          totalBalance: 1,
          lastPurchaseDate: 1,
        },
      },
    ])
    .toArray();
  return grouped.filter((c) => !registeredKeys.has(customerKey(c.name, c.phone)));
}

/** Every customer (registered + normal) with their current total balance. */
export async function fetchAllCustomerBalances(db) {
  const registered = await fetchRegisteredCustomers(db);
  const registeredKeys = new Set(registered.map((c) => customerKey(c.name, c.phone)));
  const normal = await fetchNormalCustomers(db, registeredKeys);
  return [...registered, ...normal];
}

/** Sum of all positive balances (money owed to the business). */
export async function totalOutstandingDues(db) {
  const customers = await fetchAllCustomerBalances(db);
  return customers.reduce((sum, c) => (c.totalBalance > 0 ? sum + c.totalBalance : sum), 0);
}

/** Current balance of one customer = opening balance (if registered) + sum of sale balances. */
export async function currentCustomerBalance(db, { customerName, customerPhone }) {
  const [registered, salesBalance] = await Promise.all([
    db
      .collection("customers")
      .findOne({ name: customerName, phone: customerPhone }, { projection: { openingBalance: 1 } }),
    db
      .collection("sales")
      .aggregate([{ $match: { customerName, customerPhone } }, { $group: { _id: null, total: { $sum: "$balance" } } }])
      .toArray(),
  ]);
  return (registered?.openingBalance || 0) + (salesBalance[0]?.total || 0);
}
