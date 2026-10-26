import { describe, expect, it } from "vitest";
import {
  cardRateOf,
  groupOperations,
  lotOperations,
  mainOperationOf,
  operationProgress,
  rateCardItems,
  rateCardProblem,
  rateCardTotal,
} from "@/constants/operations";
import { operationSchema, rateCardSchema } from "@/lib/validation";

const operations = [
  { _id: "o1", name: "Overlock", rate: 3.5, stage: "stitching", order: 1 },
  { _id: "o2", name: "Safety", rate: 2, stage: "stitching", order: 2 },
  { _id: "o3", name: "Belt", rate: 4, order: 3 }, // saved before main operations: stitching
  { _id: "o4", name: "Enzyme wash", rate: 6, stage: "washing", order: 4 },
  { _id: "o5", name: "Old step", rate: 1, stage: "stitching", order: 5, active: false },
  { _id: "o6", name: "Trimming", rate: 1.5, stage: "cutting", order: 6 },
];

describe("operations and category rate cards", () => {
  it("puts every operation under its main operation, in production order", () => {
    expect(mainOperationOf(operations[2])).toBe("stitching");
    expect(mainOperationOf({ stage: "nonsense" })).toBe("stitching");
    expect(groupOperations(operations).map((g) => [g.stage, g.operations.map((o) => o.name)])).toEqual([
      ["cutting", ["Trimming"]],
      ["stitching", ["Overlock", "Safety", "Belt", "Old step"]],
      ["washing", ["Enzyme wash"]],
    ]);
  });

  it("joins a card with the operations: card rates, production order, removed operations dropped", () => {
    const card = {
      category: "Baggy Pent",
      items: [
        { operationId: "o4", rate: 7 },
        { operationId: "o1", rate: 4 },
        { operationId: "gone", rate: 9 },
        { operationId: "o3", rate: 4 },
      ],
    };
    const items = rateCardItems(card, operations);
    expect(items.map((i) => [i.name, i.stage, i.rate, i.defaultRate])).toEqual([
      ["Overlock", "stitching", 4, 3.5],
      ["Belt", "stitching", 4, 4],
      ["Enzyme wash", "washing", 7, 6],
    ]);
    expect(rateCardTotal(items)).toBe(15);
    expect(cardRateOf(card, "o4")).toBe(7);
    expect(cardRateOf(card, "o2")).toBeNull();
    expect(cardRateOf(null, "o2")).toBeNull();
  });

  it("offers a lot its category's card, or every active operation when there is none", () => {
    const card = {
      items: [
        { operationId: "o1", rate: 4 },
        { operationId: "o5", rate: 1 },
      ],
    };
    const fromCard = lotOperations({ set: card, operations });
    expect(fromCard.fromCard).toBe(true);
    expect(fromCard.operations.map((o) => o.name)).toEqual(["Overlock"]); // inactive left out
    expect(fromCard.perPiece).toBe(4);

    const all = lotOperations({ set: null, operations });
    expect(all.fromCard).toBe(false);
    expect(all.operations.map((o) => o.name)).toEqual(["Trimming", "Overlock", "Safety", "Belt", "Enzyme wash"]);
    expect(all.perPiece).toBe(17);
  });

  it("shows how far each operation of the lot has got", () => {
    const offered = lotOperations({
      set: {
        items: [
          { operationId: "o1", rate: 4 },
          { operationId: "o2", rate: 2 },
        ],
      },
      operations,
    }).operations;
    const entries = [
      { operationId: "o1", pieces: 60 },
      { operationId: "o1", pieces: 40 },
      { operationId: "o2", pieces: 30 },
    ];
    expect(operationProgress(offered, entries, 100).map((o) => [o.name, o.pieces, o.complete])).toEqual([
      ["Overlock", 100, true],
      ["Safety", 30, false],
    ]);
  });

  it("checks a card before saving, and validates the requests", () => {
    expect(rateCardProblem([{ rate: "3" }, { rate: "0" }])).toBe("");
    expect(rateCardProblem([{ rate: "" }])).toMatch(/rate/);
    expect(rateCardProblem([{ rate: "-1" }])).toMatch(/rate/);
    expect(operationSchema.parse({ name: "Overlock", rate: "3.5" }).stage).toBe("stitching");
    expect(operationSchema.parse({ name: "Wash", rate: 6, stage: "washing" }).stage).toBe("washing");
    expect(() => operationSchema.parse({ name: "X", rate: 1, stage: "dancing" })).toThrow();
    const id = "64b000000000000000000001";
    expect(rateCardSchema.parse({ items: [{ operationId: id, rate: "4" }] }).items[0].rate).toBe(4);
    expect(rateCardSchema.parse({ items: [] }).items).toEqual([]);
    expect(() =>
      rateCardSchema.parse({
        items: [
          { operationId: id, rate: 1 },
          { operationId: id, rate: 2 },
        ],
      })
    ).toThrow();
  });
});
