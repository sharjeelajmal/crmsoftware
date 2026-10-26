import { describe, expect, it } from "vitest";
import {
  applyMarks,
  attendanceAdjustments,
  cutFor,
  daySheet,
  monthDays,
  monthLabel,
  monthRegister,
  presentForUnmarked,
  shiftMonth,
} from "@/constants/attendance";
import { summarizeWages } from "@/constants/wages";
import { attendanceMonthQuerySchema, attendanceSaveSchema } from "@/lib/validation";

const workers = [
  { _id: "w1", name: "Bilal", type: "stitching", dailyRate: 1000 },
  { _id: "w2", name: "Akram", type: "washing", dailyRate: 800 },
  { _id: "w3", name: "Zahid", type: "helper", dailyRate: 0 },
  { _id: "w4", name: "Old hand", dailyRate: 500, active: false },
];
const mark = (workerId, day, status, rate) => ({
  _id: `${workerId}-${day}`,
  workerId,
  workerName: workers.find((w) => w._id === workerId).name,
  day,
  date: new Date(`${day}T12:00:00`),
  status,
  rate,
  cut: cutFor(status, rate),
});

describe("attendance", () => {
  it("cuts a day's pay for absent and leave, nothing for present", () => {
    expect(cutFor("present", 1000)).toBe(0);
    expect(cutFor("absent", 1000)).toBe(1000);
    expect(cutFor("leave", 812.5)).toBe(812.5);
    expect(cutFor("absent", 0)).toBe(0);
  });

  it("lists active workers (and inactive ones already marked) with the day's counts", () => {
    const sheet = daySheet(workers, [
      mark("w1", "2026-10-26", "absent", 1000),
      mark("w2", "2026-10-26", "present", 800),
    ]);
    expect(sheet.rows.map((r) => [r.name, r.status, r.cut])).toEqual([
      ["Akram", "present", 0],
      ["Bilal", "absent", 1000],
      ["Zahid", "", 0],
    ]);
    expect(sheet.counts).toEqual({ present: 1, absent: 1, leave: 0, unmarked: 1, cut: 1000 });
    const withOld = daySheet(workers, [mark("w4", "2026-10-26", "leave", 500)]);
    expect(withOld.rows.map((r) => r.name)).toContain("Old hand");
  });

  it("applies marks before the save answers and marks the rest present", () => {
    const sheet = daySheet(workers, [mark("w1", "2026-10-26", "absent", 1000)]);
    const next = applyMarks(sheet, [
      { workerId: "w1", status: "" },
      { workerId: "w2", status: "leave" },
    ]);
    expect(next.rows.map((r) => [r.name, r.status, r.cut])).toEqual([
      ["Akram", "leave", 800],
      ["Bilal", "", 0],
      ["Zahid", "", 0],
    ]);
    expect(next.counts).toMatchObject({ leave: 1, unmarked: 2, cut: 800 });
    expect(presentForUnmarked(next)).toEqual([
      { workerId: "w1", status: "present" },
      { workerId: "w3", status: "present" },
    ]);
  });

  it("builds the month register with counts and cuts per worker", () => {
    expect(monthDays("2026-02")).toHaveLength(28);
    expect(monthDays("2026-10")[0]).toBe("2026-10-01");
    expect(monthDays("oct")).toEqual([]);
    const register = monthRegister(
      workers,
      [
        mark("w1", "2026-10-01", "present", 1000),
        mark("w1", "2026-10-02", "absent", 1000),
        mark("w1", "2026-10-03", "leave", 1000),
        mark("w2", "2026-10-02", "present", 800),
        mark("w2", "2026-11-01", "absent", 800), // other month: ignored
      ],
      "2026-10"
    );
    const bilal = register.rows.find((r) => r.name === "Bilal");
    expect(bilal.marks).toEqual({ "2026-10-01": "present", "2026-10-02": "absent", "2026-10-03": "leave" });
    expect([bilal.present, bilal.absent, bilal.leave, bilal.cut, bilal.unmarked]).toEqual([1, 1, 1, 2000, 28]);
    expect(register.totals).toEqual({ present: 2, absent: 1, leave: 1, cut: 2000 });
    expect(register.rows.map((r) => r.name)).not.toContain("Old hand");
  });

  it("moves between months and names them", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthLabel("2026-10")).toBe("October 2026");
  });

  it("feeds absent and leave days into the wages, at the rate saved on the mark", () => {
    const marks = [
      mark("w1", "2026-10-26", "absent", 1000),
      mark("w1", "2026-10-27", "leave", 1000),
      mark("w1", "2026-10-28", "present", 1000),
      mark("w3", "2026-10-26", "absent", 0),
    ];
    const adjustments = attendanceAdjustments(marks);
    expect(adjustments.map((a) => [a.type, a.amount])).toEqual([
      ["absent", 1000],
      ["leave", 1000],
      ["absent", 0],
    ]);
    const { workers: rows, totals } = summarizeWages(
      [{ workerId: "w1", workerName: "Bilal", pieces: 100, amount: 5000 }],
      adjustments
    );
    const bilal = rows.find((r) => r.workerName === "Bilal");
    expect(bilal).toMatchObject({ absentDays: 1, absents: 1000, leaveDays: 1, leaves: 1000, net: 3000 });
    expect(rows.find((r) => r.workerName === "Zahid")).toMatchObject({ absentDays: 1, absents: 0, net: 0 });
    expect(totals).toMatchObject({ absentDays: 2, absents: 1000, leaveDays: 1, net: 3000 });
  });

  it("validates the save request", () => {
    const ok = attendanceSaveSchema.parse({
      day: "2026-10-26",
      marks: [
        { workerId: "64b000000000000000000001", status: "absent" },
        { workerId: "64b000000000000000000002", status: "" },
      ],
    });
    expect(ok.marks).toHaveLength(2);
    expect(() =>
      attendanceSaveSchema.parse({
        day: "2026-10-26",
        marks: [{ workerId: "64b000000000000000000001", status: "sick" }],
      })
    ).toThrow();
    expect(() =>
      attendanceSaveSchema.parse({
        day: "2026-10-26",
        marks: [
          { workerId: "64b000000000000000000001", status: "present" },
          { workerId: "64b000000000000000000001", status: "absent" },
        ],
      })
    ).toThrow();
    expect(() => attendanceSaveSchema.parse({ day: "26-10-2026", marks: [] })).toThrow();
    expect(attendanceMonthQuerySchema.parse({ month: "2026-10" }).month).toBe("2026-10");
    expect(() => attendanceMonthQuerySchema.parse({ month: "2026-13" })).toThrow();
  });
});
