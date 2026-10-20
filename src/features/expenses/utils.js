/** Pure helpers for the expenses page. */

export const PERIOD_FILTERS = [
  { value: "daily", label: "Today" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
  { value: "all", label: "All Time" },
];

export const CUSTOM_FILTER = "custom";
export const DEFAULT_FILTER = "monthly";
export const EMPTY_RANGE = { from: undefined, to: undefined };

export const isCompleteRange = (range) => Boolean(range?.from && range?.to);

const toDateParam = (date) => date.toISOString().split("T")[0];

/** `/api/expenses` URL for a period filter, adding `from`/`to` for a custom range. */
export const expensesUrl = (dateFilter, range) => {
  const url = `/api/expenses?filter=${dateFilter}`;
  if (dateFilter !== CUSTOM_FILTER || !isCompleteRange(range)) return url;
  return `${url}&from=${toDateParam(range.from)}&to=${toDateParam(range.to)}`;
};

/** "Monthly", "Custom", ... for the total-expense stat card title. */
export const periodLabel = (dateFilter) =>
  dateFilter === CUSTOM_FILTER ? "Custom" : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1);

export const filterExpenses = (expenses, { searchTerm = "", category = "All" }) => {
  const query = searchTerm.toLowerCase();
  return expenses.filter(
    (expense) =>
      (category === "All" || expense.category === category) &&
      (expense.name.toLowerCase().includes(query) || (expense.note || "").toLowerCase().includes(query))
  );
};

/** Category with the highest spend among `expenses`. */
export const topSpendingCategory = (expenses) => {
  const totals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
  const [name = "N/A", amount = 0] = Object.entries(totals).sort(([, a], [, b]) => b - a)[0] || [];
  return { name, amount };
};

/** Shape accepted by POST/PUT /api/expenses (see expenseSchema). */
export const toExpensePayload = ({ name, category, amount, date, note }) => ({ name, category, amount, date, note });
