import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  FIRST_LOT_SEQ,
  STAGES,
  buildLot,
  buildLotEvent,
  canDeleteLot,
  canEditCutting,
  canViewLot,
  cutQtyOf,
  formatLotNumber,
  nextStage,
} from "@/lib/lots";

const admin = { sub: "a1", name: "Boss", role: "admin" };
const cutter = { sub: "c1", name: "Ali", role: "cutting_master" };
const otherCutter = { sub: "c2", name: "Bilal", role: "cutting_master" };

describe("lot numbers and stages", () => {
  it("formats sequence numbers and starts at 1001", () => {
    expect(formatLotNumber(FIRST_LOT_SEQ)).toBe("LOT-1001");
    expect(STAGES).toEqual(["cutting", "stitching", "washing", "packing", "ready"]);
    expect(nextStage("cutting")).toBe("stitching");
    expect(nextStage("ready")).toBeNull();
  });

  it("sums cut pieces across sizes", () => {
    expect(
      cutQtyOf([
        { size: "30", qty: "30" },
        { size: "32", qty: 40.9 },
        { size: "34", qty: "x" },
      ])
    ).toBe(70);
  });
});

describe("buildLot / buildLotEvent", () => {
  const product = { _id: new ObjectId(), name: "Slim Fit Denim" };
  const input = {
    productId: String(product._id),
    fabric: { name: "Denim", qty: 62, unit: "m" },
    sizes: [
      { size: "30", qty: 30 },
      { size: "32", qty: 40 },
    ],
    note: "",
  };

  it("builds a cutting-stage lot owned by the session user", () => {
    const lot = buildLot({ input, product, seq: 1001, session: cutter });
    expect(lot.lotNumber).toBe("LOT-1001");
    expect(lot.productId).toEqual(product._id);
    expect(lot.productName).toBe("Slim Fit Denim");
    expect(lot.cutQty).toBe(70);
    expect(lot.stage).toBe("cutting");
    expect(lot.stockApplied).toBe(false);
    expect(lot.createdBy).toEqual({ id: "c1", name: "Ali", role: "cutting_master" });
  });

  it("builds an event with the actor", () => {
    const ev = buildLotEvent(new ObjectId(), "created", admin, { qty: 70 });
    expect(ev.type).toBe("created");
    expect(ev.qty).toBe(70);
    expect(ev.by).toEqual({ id: "a1", name: "Boss", role: "admin" });
    expect(ev.at).toBeInstanceOf(Date);
  });
});

describe("permissions", () => {
  const lot = { stage: "cutting", createdBy: { id: "c1" } };

  it("admin and owner can view; other cutters cannot", () => {
    expect(canViewLot(lot, admin)).toBe(true);
    expect(canViewLot(lot, cutter)).toBe(true);
    expect(canViewLot(lot, otherCutter)).toBe(false);
  });

  it("cutting data is editable only at the cutting stage by owner or admin", () => {
    expect(canEditCutting(lot, cutter)).toBe(true);
    expect(canEditCutting(lot, admin)).toBe(true);
    expect(canEditCutting(lot, otherCutter)).toBe(false);
    expect(canEditCutting({ ...lot, stage: "stitching" }, cutter)).toBe(false);
  });

  it("only admins delete, and only before production", () => {
    expect(canDeleteLot(lot, admin)).toBe(true);
    expect(canDeleteLot(lot, cutter)).toBe(false);
    expect(canDeleteLot({ ...lot, stage: "washing" }, admin)).toBe(false);
  });
});
