import { describe, expect, it } from "vitest";
import { ROLES, isPathAllowedForRole, normalizeRole, roleLabel } from "@/constants/roles";

describe("roles", () => {
  it("normalises unknown/legacy roles to admin and keeps cutting_master", () => {
    expect(normalizeRole("admin")).toBe(ROLES.ADMIN);
    expect(normalizeRole("Administrator")).toBe(ROLES.ADMIN);
    expect(normalizeRole(undefined)).toBe(ROLES.ADMIN);
    expect(normalizeRole("cutting_master")).toBe(ROLES.CUTTING_MASTER);
  });

  it("labels roles for the UI", () => {
    expect(roleLabel("cutting_master")).toBe("Cutting Master");
    expect(roleLabel("whatever")).toBe("Administrator");
  });

  it("admin may open every path", () => {
    for (const p of ["/", "/sales", "/api/sales", "/cutting", "/users"]) {
      expect(isPathAllowedForRole(p, "admin")).toBe(true);
    }
  });

  it("cutting master is limited to the cutting portal, fabric khata, profile and lot/product APIs", () => {
    const allowed = [
      "/cutting",
      "/cutting/new",
      "/cutting/abc",
      "/profile",
      "/api/lots",
      "/api/lots/1",
      "/api/products",
      "/api/profile",
      "/api/auth/logout",
      "/fabric",
      "/fabric/report",
      "/api/fabric",
      "/api/fabric/receipts/1",
    ];
    const blocked = [
      "/",
      "/sales",
      "/inventory",
      "/users",
      "/api/sales",
      "/api/users",
      "/api/analytics",
      "/cuttingx",
      "/api/productsx",
      "/fabrics",
      "/api/fabricx",
    ];
    for (const p of allowed) expect(isPathAllowedForRole(p, "cutting_master"), p).toBe(true);
    for (const p of blocked) expect(isPathAllowedForRole(p, "cutting_master"), p).toBe(false);
  });
});
