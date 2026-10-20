/** Pure helpers for the Sales Team page. */

export const filterSalesmen = (salesmen, searchTerm) => {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return salesmen;
  return salesmen.filter((salesman) => salesman.name.toLowerCase().includes(term));
};

export const totalSalaries = (salesmen) => salesmen.reduce((sum, salesman) => sum + (Number(salesman.salary) || 0), 0);

/** Salesman with the highest `totalSales` (does not mutate the list). */
export const topPerformer = (salesmen) =>
  salesmen.reduce((best, salesman) => (!best || salesman.totalSales > best.totalSales ? salesman : best), null);
