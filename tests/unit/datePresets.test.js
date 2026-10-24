import { describe, expect, it } from "vitest";
import { DATE_PRESETS, activePresetKey, nextRange, presetRange, rangeDays } from "@/constants/datePresets";

const now = new Date(2026, 9, 22, 15, 30); // Thu 22 Oct 2026, 3:30 pm local
const ymd = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const span = (key) => {
  const r = presetRange(key, now);
  return `${ymd(r.from)} → ${ymd(r.to)}`;
};

describe("date presets", () => {
  it("builds whole-day ranges relative to now", () => {
    expect(span("today")).toBe("2026-10-22 → 2026-10-22");
    expect(span("yesterday")).toBe("2026-10-21 → 2026-10-21");
    expect(span("last7")).toBe("2026-10-16 → 2026-10-22");
    expect(span("last30")).toBe("2026-9-23 → 2026-10-22");
    expect(span("thisMonth")).toBe("2026-10-1 → 2026-10-22");
    expect(span("lastMonth")).toBe("2026-9-1 → 2026-9-30");
    expect(span("thisYear")).toBe("2026-1-1 → 2026-10-22");
    expect(presetRange("nope", now)).toBeNull();
    for (const preset of DATE_PRESETS) {
      const r = preset.range(now);
      expect(r.from.getHours() + r.to.getHours(), `${preset.key} at midnight`).toBe(0);
    }
  });

  it("recognises a hand-picked range that matches a preset", () => {
    expect(activePresetKey(presetRange("last7", now), now)).toBe("last7");
    expect(activePresetKey({ from: new Date(2026, 9, 16), to: new Date(2026, 9, 22) }, now)).toBe("last7");
    expect(activePresetKey({ from: new Date(2026, 9, 15), to: new Date(2026, 9, 22) }, now)).toBeNull();
    expect(activePresetKey({ from: new Date(2026, 9, 22) }, now)).toBeNull();
  });

  it("counts days with both ends included", () => {
    expect(rangeDays(presetRange("today", now))).toBe(1);
    expect(rangeDays(presetRange("last7", now))).toBe(7);
    expect(rangeDays(presetRange("lastMonth", now))).toBe(30);
    expect(rangeDays({ from: new Date(2026, 9, 1) })).toBe(0);
  });

  it("starts a fresh range when clicking after a complete one", () => {
    const complete = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 5) };
    const fresh = nextRange(
      complete,
      { from: new Date(2026, 9, 1), to: new Date(2026, 9, 9) },
      new Date(2026, 9, 9, 12)
    );
    expect(ymd(fresh.from)).toBe("2026-10-9");
    expect(fresh.to).toBeUndefined();
    const half = nextRange({ from: new Date(2026, 9, 1) }, { from: new Date(2026, 9, 1), to: new Date(2026, 9, 9) });
    expect(ymd(half.to)).toBe("2026-10-9");
  });
});
