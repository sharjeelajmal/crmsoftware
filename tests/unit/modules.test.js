import { describe, expect, it } from "vitest";
import { HIDDEN_MODULES, isHiddenPath, isModuleVisible } from "@/constants/modules";
import { navForRole } from "@/constants/navigation";
import { ROLES } from "@/constants/roles";

describe("hidden shop modules", () => {
  it("hides Sales, Customers and Recovery (and the pages that only show Sales data)", () => {
    for (const path of ["/sales", "/customers", "/recovery", "/salesman", "/analytics", "/backup"]) {
      expect(HIDDEN_MODULES, path).toContain(path);
    }
  });

  it("matches a module's sub-pages but not look-alike paths", () => {
    expect(isHiddenPath("/sales")).toBe(true);
    expect(isHiddenPath("/sales/new")).toBe(true);
    expect(isHiddenPath("/sales/64b000000000000000000001")).toBe(true);
    expect(isHiddenPath("/salesman")).toBe(true);
    expect(isHiddenPath("/salesmanager")).toBe(false);
    expect(isHiddenPath("/lots")).toBe(false);
    expect(isHiddenPath("/stitching")).toBe(false);
    expect(isModuleVisible("/inventory")).toBe(true);
    expect(isModuleVisible("/purchasing")).toBe(true);
  });

  it("leaves hidden modules out of the admin sidebar but keeps the factory and stock pages", () => {
    const { main, production } = navForRole(ROLES.ADMIN);
    const paths = [...main, ...production].map((item) => item.path);
    for (const hidden of HIDDEN_MODULES) expect(paths, hidden).not.toContain(hidden);
    for (const kept of ["/", "/inventory", "/purchasing", "/expenses", "/lots", "/stitching", "/wages"]) {
      expect(paths, kept).toContain(kept);
    }
  });

  it("does not change the cutting master's menu", () => {
    const { main } = navForRole(ROLES.CUTTING_MASTER);
    expect(main.map((item) => item.path)).toEqual(["/cutting", "/cutting/new", "/fabric", "/fabric/report"]);
  });
});
