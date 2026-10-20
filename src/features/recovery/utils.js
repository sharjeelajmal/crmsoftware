/** Name / phone search used by the recovery page. */
export const filterDebtors = (customers, searchTerm) => {
  const term = searchTerm.trim();
  if (!term) return customers;
  const lower = term.toLowerCase();
  return customers.filter(
    (customer) =>
      (customer.name || "").toLowerCase().includes(lower) || (customer.phone && customer.phone.includes(term))
  );
};
