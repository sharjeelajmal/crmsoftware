import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, hasRole } from "@/lib/auth";
import { ROLES } from "@/constants/roles";

describe("session tokens", () => {
  it("round-trips sub, name and role", async () => {
    const token = await createSessionToken({ sub: "64b0c0ffee0000000000abcd", name: "Ali", role: "cutting_master" });
    const session = await verifySessionToken(token);
    expect(session).toEqual({ sub: "64b0c0ffee0000000000abcd", name: "Ali", role: "cutting_master" });
  });

  it("normalises legacy role values to admin", async () => {
    const token = await createSessionToken({ sub: "1", name: "Boss", role: "Administrator" });
    expect((await verifySessionToken(token)).role).toBe(ROLES.ADMIN);
  });

  it("rejects tampered or missing tokens", async () => {
    const token = await createSessionToken({ sub: "1", name: "A", role: "admin" });
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });

  it("hasRole checks membership", () => {
    expect(hasRole({ role: "admin" }, [ROLES.ADMIN])).toBe(true);
    expect(hasRole({ role: "cutting_master" }, [ROLES.ADMIN])).toBe(false);
    expect(hasRole({ role: "cutting_master" }, [ROLES.ADMIN, ROLES.CUTTING_MASTER])).toBe(true);
    expect(hasRole(null, [ROLES.ADMIN])).toBe(false);
  });
});
