import { describe, expect, it } from "vitest";
import {
  lotCreateSchema,
  productSchema,
  purchaseSchema,
  saleItemSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation";

const id = "64b0c0ffee0000000000abcd";

describe("product schema", () => {
  it("accepts a product with unique sizes and coerces numbers", () => {
    const p = productSchema.parse({
      name: " Jeans ",
      category: "Pants",
      purchasePrice: "100",
      salePrice: "150",
      sizes: [{ size: "30", remaining: "5" }, { size: "32" }],
    });
    expect(p.name).toBe("Jeans");
    expect(p.purchasePrice).toBe(100);
    expect(p.sizes).toEqual([
      { size: "30", remaining: 5 },
      { size: "32", remaining: 0 },
    ]);
  });

  it("rejects duplicate sizes (case-insensitive)", () => {
    expect(() =>
      productSchema.parse({
        name: "J",
        category: "P",
        purchasePrice: 1,
        salePrice: 2,
        sizes: [{ size: "M" }, { size: "m" }],
      })
    ).toThrow(/unique/i);
  });

  it("rejects negative prices", () => {
    expect(() => productSchema.parse({ name: "J", category: "P", purchasePrice: -1, salePrice: 2 })).toThrow();
  });
});

describe("sale item / purchase size", () => {
  it("keeps an optional size on sale items and purchases", () => {
    expect(saleItemSchema.parse({ desc: "Jeans", qty: 1, price: 10, productId: id, size: "32" }).size).toBe("32");
    expect(purchaseSchema.parse({ productId: id, vendorId: id, quantity: 3, costPerItem: 50, size: "L" }).size).toBe(
      "L"
    );
    expect(purchaseSchema.parse({ productId: id, vendorId: id, quantity: 3, costPerItem: 50 }).size).toBeUndefined();
  });
});

describe("lot schema", () => {
  const base = {
    productId: id,
    fabric: { name: "Denim 12oz", qty: "62", unit: "m" },
    sizes: [
      { size: "30", qty: "30" },
      { size: "32", qty: 40 },
    ],
  };

  it("accepts a valid cutting entry", () => {
    const lot = lotCreateSchema.parse(base);
    expect(lot.fabric.qty).toBe(62);
    expect(lot.sizes[0].qty).toBe(30);
    expect(lot.note).toBe("");
  });

  it("requires at least one size with pieces", () => {
    expect(() => lotCreateSchema.parse({ ...base, sizes: [] })).toThrow();
    expect(() => lotCreateSchema.parse({ ...base, sizes: [{ size: "30", qty: 0 }] })).toThrow(/more than 0/);
    expect(() =>
      lotCreateSchema.parse({
        ...base,
        sizes: [
          { size: "30", qty: 1 },
          { size: "30", qty: 1 },
        ],
      })
    ).toThrow(/unique/i);
  });

  it("rejects an invalid product id", () => {
    expect(() => lotCreateSchema.parse({ ...base, productId: "nope" })).toThrow();
  });
});

describe("user schemas", () => {
  it("requires a role from the known list and a 6+ char password", () => {
    expect(userCreateSchema.parse({ name: "Ali", password: "secret1", role: "cutting_master" }).role).toBe(
      "cutting_master"
    );
    expect(() => userCreateSchema.parse({ name: "Ali", password: "12345", role: "admin" })).toThrow();
    expect(() => userCreateSchema.parse({ name: "Ali", password: "secret1", role: "boss" })).toThrow();
  });

  it("allows partial updates", () => {
    expect(userUpdateSchema.parse({ active: false })).toEqual({ active: false });
    expect(() => userUpdateSchema.parse({ email: "not-an-email" })).toThrow();
  });
});
