import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { stockChangeOps, totalOfSizes, withSizeTotals } from "@/lib/inventory";
import { addedInRange, filterProducts, productAddedAt } from "@/features/inventory/utils";

describe("sizes", () => {
  it("sums size stock and derives the product total", () => {
    const product = withSizeTotals({
      name: "Jeans",
      remaining: 999,
      sizes: [
        { size: "30", remaining: "4" },
        { size: " 32 ", remaining: 6 },
      ],
    });
    expect(product.remaining).toBe(10);
    expect(product.sizes).toEqual([
      { size: "30", remaining: 4 },
      { size: "32", remaining: 6 },
    ]);
    expect(totalOfSizes(product.sizes)).toBe(10);
  });

  it("leaves unsized products untouched", () => {
    expect(withSizeTotals({ name: "Cap", remaining: 7 })).toEqual({ name: "Cap", remaining: 7 });
    expect(withSizeTotals({ name: "Cap", remaining: 7, sizes: [] }).remaining).toBe(7);
  });
});

describe("stockChangeOps", () => {
  const id = new ObjectId().toHexString();

  it("deducts by product id and by size when given", () => {
    const ops = stockChangeOps([{ desc: "Jeans", qty: "3", productId: id, size: "32" }], -1);
    expect(ops).toHaveLength(2);
    expect(ops[0].updateOne.filter).toEqual({ _id: new ObjectId(id) });
    expect(ops[0].updateOne.update).toEqual({ $inc: { remaining: -3 } });
    expect(ops[1].updateOne.filter).toEqual({ _id: new ObjectId(id), "sizes.size": "32" });
    expect(ops[1].updateOne.update).toEqual({ $inc: { "sizes.$.remaining": -3 } });
  });

  it("falls back to the product name for legacy items and restores with +1", () => {
    const ops = stockChangeOps([{ desc: "Old Shirt", qty: 2 }], +1);
    expect(ops).toEqual([{ updateOne: { filter: { name: "Old Shirt" }, update: { $inc: { remaining: 2 } } } }]);
  });

  it("skips blank rows and zero quantities", () => {
    expect(
      stockChangeOps(
        [
          { desc: "", qty: 5 },
          { desc: "X", qty: 0 },
          { desc: "Y", qty: "abc" },
        ],
        -1
      )
    ).toEqual([]);
  });
});

describe("inventory date filter (added on)", () => {
  // 2026-10-22 10:00 local, written into a Mongo id the way the server does for older products.
  const oct22 = new Date(2026, 9, 22, 10, 0);
  const idAt = (date) => Math.floor(date.getTime() / 1000).toString(16).padStart(8, "0") + "0000000000000000";
  const products = [
    { _id: idAt(new Date(2026, 1, 1)), name: "Old Hoodie", category: "Tops", remaining: 5 },
    { _id: idAt(oct22), name: "New Pents", category: "Pants", remaining: 47, createdAt: oct22.toISOString() },
    { _id: idAt(new Date(2026, 9, 25)), name: "Baggy pents", category: "Pants", remaining: 0 },
  ];
  const range = (from, to) => ({ from: new Date(from), to: new Date(to) });

  it("uses createdAt, else the time inside the product id", () => {
    expect(productAddedAt(products[1]).getTime()).toBe(oct22.getTime());
    expect(productAddedAt(products[0]).getTime()).toBe(new Date(2026, 1, 1).getTime());
    expect(productAddedAt({ _id: "not-an-id" })).toBeNull();
  });

  it("keeps whole days, both ends included; no range keeps everything", () => {
    expect(addedInRange(products[1], range("2026-10-22T00:00", "2026-10-22T00:00"))).toBe(true);
    expect(addedInRange(products[1], range("2026-10-23T00:00", "2026-10-31T00:00"))).toBe(false);
    expect(addedInRange(products[1], null)).toBe(true);
    expect(addedInRange({ _id: "x" }, range("2026-10-01T00:00", "2026-10-31T00:00"))).toBe(false);
  });

  it("combines with search, category and stock filters", () => {
    const october = range("2026-10-01T00:00", "2026-10-31T00:00");
    expect(filterProducts(products, { addedRange: october }).map((p) => p.name)).toEqual(["New Pents", "Baggy pents"]);
    expect(filterProducts(products, { addedRange: october, searchTerm: "baggy" }).map((p) => p.name)).toEqual([
      "Baggy pents",
    ]);
    expect(filterProducts(products, { category: "Tops" }).map((p) => p.name)).toEqual(["Old Hoodie"]);
  });
});
