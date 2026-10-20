import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { stockChangeOps, totalOfSizes, withSizeTotals } from "@/lib/inventory";

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
