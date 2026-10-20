"use client";

import { useCallback, useMemo, useState } from "react";
import { blankItem, blankItems, computeTotals, isCompleteItem, missingSizeMessage, toApiItem } from "../utils";

const EMPTY_CUSTOMER = { name: "", phone: "" };
const EMPTY_CHARGES = { others: 0, discount: 0, receivedAmount: 0 };
const NO_SUGGESTIONS = { rowIndex: -1, products: [] };

/** Editable state of the on-screen invoice (customer, item rows, charges) plus derived totals. */
export function useInvoiceForm(products) {
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [items, setItems] = useState(blankItems);
  const [charges, setCharges] = useState(EMPTY_CHARGES);
  const [suggestions, setSuggestions] = useState(NO_SUGGESTIONS);

  const totals = useMemo(() => computeTotals(items, charges), [items, charges]);

  const updateCustomer = useCallback((field, value) => setCustomer((prev) => ({ ...prev, [field]: value })), []);

  const updateCharge = useCallback((field, value) => setCharges((prev) => ({ ...prev, [field]: value })), []);

  const updateItem = useCallback(
    (index, field, value) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          // Typing a description by hand drops the product link (and its size); clearing it empties the row.
          if (field === "desc") {
            return value ? { ...item, desc: value, productId: undefined, size: undefined } : blankItem();
          }
          return { ...item, [field]: value };
        })
      );
      if (field === "desc") {
        const matches = value ? products.filter((p) => p.name.toLowerCase().includes(value.toLowerCase())) : [];
        setSuggestions(matches.length > 0 ? { rowIndex: index, products: matches } : NO_SUGGESTIONS);
      }
    },
    [products]
  );

  const pickProduct = useCallback((index, product) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, desc: product.name, price: product.salePrice, productId: product._id, size: undefined }
          : item
      )
    );
    setSuggestions(NO_SUGGESTIONS);
  }, []);

  const addRow = useCallback(() => setItems((prev) => [...prev, blankItem()]), []);

  const reset = useCallback(() => {
    setCustomer(EMPTY_CUSTOMER);
    setItems(blankItems());
    setCharges(EMPTY_CHARGES);
    setSuggestions(NO_SUGGESTIONS);
  }, []);

  /** Returns a message when the form cannot be saved yet (a sized product row without a size), else null. */
  const validate = useCallback(() => missingSizeMessage(items, products), [items, products]);

  /** The document sent to POST /api/sales (rows of sized products without a size are left out). */
  const buildSale = useCallback(
    (invoiceNumber) => ({
      invoiceNumber,
      customerName: customer.name,
      customerPhone: customer.phone,
      items: items.filter((item) => isCompleteItem(item, products)).map(toApiItem),
      total: totals.total,
      others: parseFloat(charges.others) || 0,
      discount: parseFloat(charges.discount) || 0,
      subTotal: totals.subTotal,
      receivedAmount: parseFloat(charges.receivedAmount) || 0,
      balance: totals.balance,
      invoiceDate: new Date(),
    }),
    [customer, items, charges, totals, products]
  );

  return {
    customer,
    items,
    charges,
    totals,
    products,
    suggestions,
    updateCustomer,
    updateCharge,
    updateItem,
    pickProduct,
    addRow,
    reset,
    validate,
    buildSale,
  };
}
