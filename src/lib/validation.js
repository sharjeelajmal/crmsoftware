import { z } from "zod";
import { ALL_ROLES } from "@/constants/roles";
import { LEDGER_TYPES } from "@/constants/ledger";
import { ADJUSTMENT_TYPES } from "@/constants/wages";
import { GATE_PASS_TYPES } from "@/constants/gatepass";

/**
 * Request schemas for every API resource. Keep them here so the API contract
 * is visible in one place. Pages send the same shapes they always did; the
 * schemas coerce numeric strings ("12") to numbers, strip unknown keys
 * (e.g. `_id`, computed totals echoed back by the UI) and reject garbage.
 */

const trimmed = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 500) => z.string().trim().max(max).optional().default("");
const money = z.coerce.number().finite();
const nonNegative = money.min(0);
const dateLike = z.coerce.date();
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// ---- Auth & users ---------------------------------------------------------
export const loginSchema = z.object({
  username: trimmed(120),
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(200),
});

export const profileUpdateSchema = z.object({
  name: trimmed(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: optionalText(40),
  avatar: z.string().max(2_000_000).optional(), // data URL or path
});

export const userRoleSchema = z.enum(ALL_ROLES);

export const userCreateSchema = z.object({
  name: trimmed(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: optionalText(40),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
  role: userRoleSchema,
});

export const userUpdateSchema = z
  .object({
    name: trimmed(120),
    email: z.string().trim().email().max(200).or(z.literal("")),
    phone: z.string().trim().max(40),
    password: z.string().min(6, "Password must be at least 6 characters").max(200),
    role: userRoleSchema,
    active: z.boolean(),
  })
  .partial();

// ---- Catalogue ------------------------------------------------------------
export const categorySchema = z.object({ name: trimmed(80) });

/** A size variant of a product: stock per size. */
export const sizeStockSchema = z.object({
  size: trimmed(20),
  remaining: z.coerce.number().int().min(0).default(0),
});

const uniqueSizes = (sizes) => new Set(sizes.map((s) => s.size.toLowerCase())).size === sizes.length;

export const productSchema = z.object({
  name: trimmed(120),
  category: trimmed(80),
  purchasePrice: nonNegative,
  salePrice: nonNegative,
  remaining: z.coerce.number().int().min(0).default(0),
  sizes: z.array(sizeStockSchema).max(50).refine(uniqueSizes, "Sizes must be unique").optional(),
});

export const productUpdateSchema = productSchema.partial();

// ---- Customers ------------------------------------------------------------
export const customerSchema = z.object({
  name: trimmed(120),
  phone: trimmed(40),
  city: optionalText(120),
  openingBalance: money.optional().default(0),
});

export const customerUpdateSchema = customerSchema.partial();

// ---- Sales ----------------------------------------------------------------
// Rows with an empty description are blank form lines; routes drop them (see cleanSaleItems).
export const saleItemSchema = z.object({
  desc: z.string().trim().max(200).default(""),
  qty: z.coerce.number().min(0).default(0),
  price: nonNegative.default(0),
  productId: objectId.optional(),
  size: z.string().trim().max(20).optional(),
});

export const cleanSaleItems = (items = []) => items.filter((item) => item.desc && item.qty > 0);

export const saleSchema = z.object({
  invoiceNumber: z.coerce.number().int().positive(),
  customerName: trimmed(120),
  customerPhone: z.string().trim().max(40).default(""),
  items: z.array(saleItemSchema).default([]),
  total: money,
  subTotal: money,
  others: money.default(0),
  discount: money.default(0),
  receivedAmount: money.default(0),
  balance: money,
  invoiceDate: dateLike.default(() => new Date()),
  salesmanId: objectId.optional(),
});

export const saleUpdateSchema = saleSchema.partial();

export const saleAdjustSchema = z.object({
  customerName: trimmed(120),
  customerPhone: z.string().trim().max(40).default(""),
  newTotalBalance: money,
});

export const saleLinkSchema = z.object({
  invoiceNumber: z.coerce.number().int().positive(),
  salesmanId: objectId,
});

export const salesQuerySchema = z.object({
  customerName: z.string().trim().optional(),
  salesmanId: objectId.optional(),
});

// ---- Salesmen -------------------------------------------------------------
export const salesmanSchema = z.object({
  name: trimmed(120),
  phone: trimmed(40),
  secondaryPhone: optionalText(40),
  address: optionalText(300),
  cnic: optionalText(40),
  salary: nonNegative.default(0),
  joiningDate: dateLike.default(() => new Date()),
});

export const salesmanUpdateSchema = salesmanSchema.partial();

// ---- Purchasing -----------------------------------------------------------
export const vendorSchema = z.object({
  name: trimmed(120),
  contactPerson: optionalText(120),
  phone: optionalText(40),
});

export const vendorUpdateSchema = vendorSchema.partial();

export const purchaseSchema = z.object({
  productId: objectId,
  vendorId: objectId,
  quantity: z.coerce.number().int().positive(),
  costPerItem: nonNegative,
  purchaseDate: dateLike.default(() => new Date()),
  size: z.string().trim().max(20).optional(),
});

// ---- Expenses -------------------------------------------------------------
export const expenseCategorySchema = z.object({ name: trimmed(80) });

export const expenseSchema = z.object({
  name: trimmed(200),
  category: trimmed(80),
  amount: nonNegative,
  date: dateLike,
  note: optionalText(500),
});

export const expenseUpdateSchema = expenseSchema.partial();

// ---- Production: lots -----------------------------------------------------
export const LOT_STAGES = Object.freeze(["cutting", "stitching", "washing", "packing", "ready"]);

export const lotSizeSchema = z.object({
  size: trimmed(20),
  qty: z.coerce.number().int().min(0).default(0),
});

export const lotCreateSchema = z.object({
  productId: objectId,
  fabric: z.object({
    name: trimmed(120),
    qty: nonNegative.default(0),
    unit: z.string().trim().max(20).default("m"),
  }),
  sizes: z
    .array(lotSizeSchema)
    .min(1, "At least one size row is required")
    .max(50)
    .refine(uniqueSizes, "Sizes must be unique")
    .refine((sizes) => sizes.some((s) => s.qty > 0), "Total pieces must be more than 0"),
  bundleNumber: optionalText(40),
  shrinkage: z.coerce.number().min(0).max(100).nullable().optional(), // percent, printed on the gate pass
  note: optionalText(500),
});

export const lotUpdateSchema = lotCreateSchema.partial();

export const lotStageActionSchema = z.object({
  action: z.enum(["send_stitching", "stitched", "washed", "ready"]),
  qty: z.coerce.number().int().min(0).optional(),
  // ready only: pieces per size that go into stock (must add up to qty); omitted = proportional split
  sizes: z.array(lotSizeSchema).max(50).optional(),
  washType: optionalText(80), // stitched only: printed on the washing gate pass
  note: optionalText(500),
});

export const gatePassIssueSchema = z.object({
  type: z.enum(GATE_PASS_TYPES),
  washType: optionalText(80),
});

/** Partial "gate pass out" from stitching to washing. */
export const lotDispatchSchema = z.object({
  pieces: z.coerce.number().int().positive("Pieces must be more than 0"),
  washType: optionalText(80),
  note: optionalText(500),
});

export const lotReverseSchema = z.object({
  reason: trimmed(500),
});

export const lotsQuerySchema = z.object({
  stage: z.enum(LOT_STAGES).optional(),
  mine: z.enum(["1", "true"]).optional(),
  productId: objectId.optional(),
});

// ---- Filters --------------------------------------------------------------
export const periodQuerySchema = z.object({
  filter: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

// ---- Loose items & B-pair register (no link to stock) ---------------------
export const ledgerEntrySchema = z.object({
  type: z.enum(LEDGER_TYPES),
  item: trimmed(120),
  qty: money.gt(0, "Quantity must be more than 0"),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  note: optionalText(500),
  lotId: objectId.nullable().optional(), // optional link to the lot the pieces came from
});

// Explicit (no defaults) so a partial edit never resets unit/note to their defaults.
export const ledgerEntryUpdateSchema = z.object({
  type: z.enum(LEDGER_TYPES).optional(),
  item: trimmed(120).optional(),
  qty: money.gt(0, "Quantity must be more than 0").optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  note: z.string().trim().max(500).optional(),
  lotId: objectId.nullable().optional(),
});

export const ledgerQuerySchema = periodQuerySchema.extend({
  type: z.enum(LEDGER_TYPES).optional(),
  lotId: objectId.optional(),
  search: z.string().trim().max(120).optional(),
});

// ---- Workers & wages ------------------------------------------------------
export const workerSchema = z.object({
  name: trimmed(120),
  phone: optionalText(40),
  type: z.string().trim().max(40).default("stitching"), // stitching / washing / packing / helper …
  dailyRate: nonNegative.default(0), // per-day salary: one day of leave is cut at this rate (0 = piece rate only)
  note: optionalText(500),
  active: z.boolean().default(true),
});

export const workerUpdateSchema = z.object({
  name: trimmed(120).optional(),
  phone: z.string().trim().max(40).optional(),
  type: z.string().trim().min(1).max(40).optional(),
  dailyRate: nonNegative.optional(),
  note: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

export const operationSchema = z.object({
  name: trimmed(80),
  rate: nonNegative, // Rs per piece
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const operationUpdateSchema = z.object({
  name: trimmed(80).optional(),
  rate: nonNegative.optional(),
  order: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

/** One worker doing one operation on one lot. The rate is copied from the operation (editable per assignment). */
export const workEntrySchema = z.object({
  lotId: objectId,
  operationId: objectId,
  workerId: objectId,
  pieces: z.coerce.number().int().positive("Pieces must be more than 0"),
  rate: nonNegative.optional(), // omitted = the operation's current rate
  date: dateLike.optional(),
  note: optionalText(500),
});

/** Assign one operation to several workers at once (lot page). */
export const workAssignmentSchema = z.object({
  lotId: objectId,
  operationId: objectId,
  rate: nonNegative.optional(),
  date: dateLike.optional(),
  note: optionalText(500),
  rows: z
    .array(z.object({ workerId: objectId, pieces: z.coerce.number().int().positive() }))
    .min(1, "Add at least one worker")
    .max(50)
    .refine((rows) => new Set(rows.map((r) => r.workerId)).size === rows.length, "A worker can only appear once"),
});

export const workEntryUpdateSchema = z.object({
  pieces: z.coerce.number().int().positive().optional(),
  rate: nonNegative.optional(),
  date: dateLike.optional(),
  note: z.string().trim().max(500).optional(),
});

export const workEntriesQuerySchema = periodQuerySchema.extend({
  lotId: objectId.optional(),
  workerId: objectId.optional(),
  operationId: objectId.optional(),
});

/** Leave needs `days` (rate defaults to the worker's per-day salary); every other type needs an `amount`. */
export const wageAdjustmentSchema = z
  .object({
    workerId: objectId,
    type: z.enum(ADJUSTMENT_TYPES),
    amount: money.min(0).optional(),
    days: z.coerce.number().positive().max(31).optional(),
    rate: nonNegative.optional(),
    date: dateLike.optional(),
    note: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.type === "leave") {
      if (!(value.days > 0))
        ctx.addIssue({ code: "custom", path: ["days"], message: "Leave days must be more than 0" });
    } else if (!(value.amount > 0)) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Amount must be more than 0" });
    }
  });

export const wagesQuerySchema = periodQuerySchema.extend({
  workerId: objectId.optional(),
});
