import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { getSession, hasRole } from "@/lib/auth";
import { ROLES } from "@/constants/roles";

/**
 * Shared helpers for route handlers.
 *
 *   export const GET = route(async (request, { params, session }) => { ... return ok(data); });
 *   export const POST = route(handler, { roles: [ROLES.ADMIN, ROLES.CUTTING_MASTER] });
 *
 * - `route()` wraps a handler: verifies the session and role (default: admin only), then maps
 *   ApiError -> its status, ZodError -> 400, anything else -> 500 (logged).
 * - The verified session is passed as `context.session` ({ sub, name, role }).
 * - `parseBody()` / `parseQuery()` validate against a zod schema.
 * - `requireObjectId()` / `requireParam()` validate dynamic route params.
 */

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const ok = (data, init) => NextResponse.json(data, init);
export const created = (data) => NextResponse.json(data, { status: 201 });

export const notFound = (what = "Resource") => new ApiError(404, `${what} not found`);
export const badRequest = (message, details) => new ApiError(400, message, details);
export const forbidden = (message = "Forbidden") => new ApiError(403, message);
export const conflict = (message) => new ApiError(409, message);

const DEFAULT_ROLES = [ROLES.ADMIN];

export function route(handler, { roles = DEFAULT_ROLES } = {}) {
  return async (request, context = {}) => {
    try {
      const session = await getSession(request);
      if (!session) throw new ApiError(401, "Unauthorized");
      if (!hasRole(session, roles)) throw forbidden();
      return await handler(request, { ...context, session });
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 }
        );
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}:`, err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/** Public route (login): no session required. */
export function publicRoute(handler) {
  return async (request, context = {}) => {
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          },
          { status: 400 }
        );
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}:`, err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function parseBody(request, schema) {
  const body = await request.json();
  return schema.parse(body);
}

export function parseQuery(request, schema) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

/** @returns {Promise<ObjectId>} */
export async function requireObjectId(context, key = "id") {
  const params = await context.params;
  const value = params?.[key];
  if (!value || !ObjectId.isValid(value)) throw badRequest(`Invalid ${key}`);
  return new ObjectId(value);
}

/** @returns {Promise<string>} decoded, trimmed route param */
export async function requireParam(context, key) {
  const params = await context.params;
  const value = decodeURIComponent(params?.[key] ?? "").trim();
  if (!value) throw badRequest(`Missing ${key}`);
  return value;
}

/** Escapes user input before it is placed inside a $regex. */
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
