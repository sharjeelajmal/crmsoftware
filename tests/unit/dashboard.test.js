import { describe, expect, it } from "vitest";
import {
  IDLE_WARN_DAYS,
  TREND_DAYS,
  compactNumber,
  dayKey,
  fillDailySeries,
  greetingFor,
  idleDays,
  lastDayKeys,
  niceTicks,
  percentChange,
  piecesByLocation,
  plural,
  pipelineLoad,
  shareParts,
  topWithOther,
  utcOffsetOf,
  waitingLongest,
} from "@/constants/dashboard";

const NOW = new Date(2026, 9, 23, 15, 30); // 23 Oct 2026, 3:30 pm local
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("dashboard: day buckets", () => {
  it("lists the last 14 local days, oldest first, ending today", () => {
    const keys = lastDayKeys(NOW);
    expect(keys).toHaveLength(TREND_DAYS);
    expect(keys[0]).toBe("2026-10-10");
    expect(keys.at(-1)).toBe("2026-10-23");
    expect(keys.at(-1)).toBe(dayKey(NOW));
  });

  it("crosses a month end without gaps", () => {
    expect(lastDayKeys(new Date(2026, 10, 2), 4)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });

  it("fills missing days with 0 and merges every series by day", () => {
    const rows = fillDailySeries(["2026-10-21", "2026-10-22", "2026-10-23"], {
      cut: [{ _id: "2026-10-22", pieces: 35 }],
      produced: [
        { _id: "2026-10-22", pieces: 31 },
        { _id: "2026-10-23", pieces: -4 },
      ],
    });
    expect(rows).toEqual([
      { date: "2026-10-21", cut: 0, produced: 0 },
      { date: "2026-10-22", cut: 35, produced: 31 },
      { date: "2026-10-23", cut: 0, produced: -4 },
    ]);
  });

  it("formats the local UTC offset for Mongo's timezone option", () => {
    const at = (minutes) => ({ getTimezoneOffset: () => minutes });
    expect(utcOffsetOf(at(-300))).toBe("+05:00"); // Pakistan
    expect(utcOffsetOf(at(0))).toBe("+00:00");
    expect(utcOffsetOf(at(-330))).toBe("+05:30");
    expect(utcOffsetOf(at(240))).toBe("-04:00");
  });
});

describe("dashboard: comparisons and formatting", () => {
  it("gives a whole % change, or null when there is nothing to compare with", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(50, 200)).toBe(-75);
    expect(percentChange(10, 10)).toBe(0);
    expect(percentChange(35, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("keeps small numbers exact and compacts big ones", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(9_999)).toBe("9,999");
    expect(compactNumber(12_900)).toBe("12.9K");
    expect(compactNumber(4_200_000)).toBe("4.2M");
    expect(compactNumber("abc")).toBe("0");
  });

  it("rounds axis ticks to clean whole-piece steps", () => {
    expect(niceTicks(0, 35)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(0, 410)).toEqual([0, 100, 200, 300, 400, 500]);
    expect(niceTicks(0, 4)).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(0, 0)).toEqual([0, 1]);
    expect(niceTicks(0, 2300)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    expect(niceTicks(-30, 120)).toEqual([-50, 0, 50, 100, 150]);
  });

  it("says 1 lot but 0 / 3 lots", () => {
    expect(plural(1, "lot")).toBe("lot");
    expect(plural(0, "lot")).toBe("lots");
    expect(plural(3, "lot")).toBe("lots");
    expect(plural(2, "day", "days")).toBe("days");
  });

  it("greets by the local hour", () => {
    expect(greetingFor(new Date(2026, 9, 23, 6))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 9, 23, 13))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 9, 23, 19))).toBe("Good evening");
    expect(greetingFor(new Date(2026, 9, 23, 2))).toBe("Good evening");
  });

  it("splits a total into shares and folds the smallest categories into Other", () => {
    const { total, parts } = shareParts([
      { key: "a", value: 300 },
      { key: "b", value: 100 },
      { key: "c", value: 0 },
    ]);
    expect(total).toBe(400);
    expect(parts.map((p) => p.share)).toEqual([0.75, 0.25, 0]);
    expect(shareParts([{ key: "a", value: 0 }]).parts[0].share).toBe(0);

    const heads = topWithOther(
      [
        { category: "Rent", amount: 500 },
        { category: "Tea", amount: 20 },
        { category: "Power", amount: 300 },
        { category: "Fuel", amount: 50 },
        { category: "Misc", amount: 30 },
        { category: "Zero", amount: 0 },
      ],
      4
    );
    expect(heads).toEqual([
      { category: "Rent", amount: 500 },
      { category: "Power", amount: 300 },
      { category: "Fuel", amount: 50 },
      { category: "Other", amount: 50 },
    ]);
  });
});

describe("dashboard: pipeline", () => {
  const lots = [
    { _id: "1", lotNumber: "LOT-1001", stage: "cutting", cutQty: 100, updatedAt: daysAgo(1) },
    { _id: "2", lotNumber: "LOT-1002", stage: "stitching", cutQty: 100, stitchOutQty: 40, updatedAt: daysAgo(9) },
    { _id: "3", lotNumber: "LOT-1003", stage: "washing", cutQty: 100, stitchedQty: 98, updatedAt: daysAgo(3) },
    { _id: "4", lotNumber: "LOT-1004", stage: "packing", cutQty: 100, stitchedQty: 98, washedQty: 95, updatedAt: NOW },
    { _id: "5", lotNumber: "LOT-1005", stage: "ready", cutQty: 50, readyQty: 50, updatedAt: daysAgo(30) },
  ];

  it("counts pieces where they physically are (sent-out stitching pieces are at washing)", () => {
    expect(piecesByLocation(lots[1])).toEqual({ stitching: 60, washing: 40 });
    expect(piecesByLocation(lots[4])).toEqual({});
    expect(pipelineLoad(lots)).toEqual({
      cutting: { lots: 1, pieces: 100 },
      stitching: { lots: 1, pieces: 60 },
      washing: { lots: 1, pieces: 138 },
      packing: { lots: 1, pieces: 95 },
    });
  });

  it("measures idle days from the last change", () => {
    expect(idleDays(lots[1], NOW)).toBe(9);
    expect(idleDays(lots[3], NOW)).toBe(0);
    expect(idleDays({ createdAt: daysAgo(2) }, NOW)).toBe(2);
  });

  it("lists active lots that waited longest first and skips ready lots", () => {
    const waiting = waitingLongest(lots, NOW, 3);
    expect(waiting.map((lot) => lot.lotNumber)).toEqual(["LOT-1002", "LOT-1003", "LOT-1001"]);
    expect(waiting[0]).toMatchObject({ stage: "stitching", pieces: 100, idleDays: 9 });
    expect(waiting[0].idleDays >= IDLE_WARN_DAYS).toBe(true);
  });
});
