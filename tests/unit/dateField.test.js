import { describe, expect, it } from "vitest";
import { dateToValue, valueToDate } from "@/constants/datePresets";

describe("DatePickerField value helpers", () => {
  it("turns a Date or an ISO string into the field's yyyy-MM-dd value", () => {
    expect(dateToValue(new Date(2026, 9, 26, 15, 30))).toBe("2026-10-26");
    expect(dateToValue(new Date(2026, 0, 5).toISOString())).toBe("2026-01-05");
    expect(dateToValue(null)).toBe("");
    expect(dateToValue("not a date")).toBe("");
  });

  it("turns the field value back into a local-midnight Date", () => {
    const at = valueToDate("2026-10-09");
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours()]).toEqual([2026, 9, 9, 0]);
    expect(valueToDate("")).toBeNull();
    expect(valueToDate("09/10/2026")).toBeNull();
  });
});
