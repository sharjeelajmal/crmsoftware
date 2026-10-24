import { describe, expect, it } from "vitest";
import { producedPieces } from "@/lib/production";
import { sizeSplitHint } from "@/features/inventory/utils";

describe("producedPieces", () => {
  it("nets ready movements against reversals and ignores other reasons", () => {
    const movements = [
      { reason: "lot_ready", qty: 58 },
      { reason: "lot_ready", qty: 59 },
      { reason: "lot_reversed", qty: -117 },
      { reason: "lot_ready", qty: "100" },
      { reason: "sale", qty: -5 },
      { reason: "purchase", qty: 20 },
    ];
    expect(producedPieces(movements)).toBe(100);
    expect(producedPieces([])).toBe(0);
    expect(producedPieces()).toBe(0);
  });
});

describe("sizeSplitHint", () => {
  const product = { name: "Cap", remaining: 120 };

  it("tells the user how the split compares with the current stock", () => {
    const even = sizeSplitHint(product, [
      { size: "30", remaining: "60" },
      { size: "32", remaining: "60" },
    ]);
    expect(even).toMatchObject({ total: 120, current: 120, diff: 0 });
    expect(even.message).toMatch(/add up to the current stock \(120 pcs\)/);

    const less = sizeSplitHint(product, [{ size: "30", remaining: "100" }]);
    expect(less).toMatchObject({ total: 100, diff: -20 });
    expect(less.message).toMatch(/20 less than the current stock/);
    expect(less.message).toMatch(/Total becomes 100/);

    const more = sizeSplitHint(product, [{ size: "30", remaining: "130" }]);
    expect(more).toMatchObject({ total: 130, diff: 10 });
    expect(more.message).toMatch(/10 more than the current stock/);
  });

  it("treats blank rows and missing stock as zero", () => {
    expect(sizeSplitHint({}, [{ size: "30", remaining: "" }])).toMatchObject({ total: 0, current: 0, diff: 0 });
  });
});
