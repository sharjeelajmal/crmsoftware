import { z } from "zod";
import { ALL_ROLES } from "@/constants/roles";
import { LEDGER_TYPES } from "@/constants/ledger";
import { ADJUSTMENT_TYPES } from "@/constants/wages";
import { ISSUABLE_GATE_PASS_TYPES } from "@/constants/gatepass";
import { PAYMENT_METHODS } from "@/constants/purchasingLedger";
import { FABRIC_UNITS } from "@/constants/fabric";
import { ATTENDANCE_STATUSES } from "@/constants/attendance";
import { MAIN_OPERATIONS } from "@/constants/operations";

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

/**
 * The update form of a create schema: every field optional and without its default. Zod 4's `.partial()` still
 * fills `.default()`s in for keys that were not sent, so a partial update (only the balance, only the stock) would
 * overwrite the other fields with their defaults (city → "", remaining → 0).
 */
const updateSchemaOf = (schema) =>
  z.object(
    Object.fromEntries(
      Object.entries(schema.shape).map(([key, field]) => [
        key,
        (field instanceof z.ZodDefault ? field.removeDefault() : field).optional(),
      ])
    )
  );

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

export const productUpdateSchema = updateSchemaOf(productSchema);

// ---- Customers ------------------------------------------------------------
export const customerSchema = z.object({
  name: trimmed(120),
  phone: trimmed(40),
  city: optionalText(120),
  openingBalance: money.optional().default(0),
});

export const customerUpdateSchema = updateSchemaOf(customerSchema);

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

export const saleUpdateSchema = updateSchemaOf(saleSchema);

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

export const salesmanUpdateSchema = updateSchemaOf(salesmanSchema);

// ---- Purchasing -----------------------------------------------------------
export const vendorSchema = z.object({
  name: trimmed(120),
  contactPerson: optionalText(120),
  phone: optionalText(40),
});

export const vendorUpdateSchema = updateSchemaOf(vendorSchema);

// ---- Purchasing ledger (vendor khata) ---------------------------------------
export const vendorPaymentSchema = z.object({
  vendorId: objectId,
  amount: money.refine((n) => n > 0, "Amount must be more than 0"),
  date: dateLike.optional(),
  method: z.enum(PAYMENT_METHODS).default("cash"),
  note: optionalText(300),
});

const dayString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date")
  .optional();

export const purchaseLedgerQuerySchema = z.object({
  vendorId: objectId.optional(),
  from: dayString,
  to: dayString,
});

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

export const expenseUpdateSchema = updateSchemaOf(expenseSchema);

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
  bundleNumber: optionalText(40), // shown as "Cut number" (client, 2026-10-29)
  // Free text, written as the cutting master likes ("2 inch", "3-4"); a number from an older client becomes its text.
  shrinkage: z
    .preprocess((v) => (typeof v === "number" ? String(v) : v === null ? "" : v), z.string().trim().max(40))
    .optional(),
  note: optionalText(500),
});

export const lotUpdateSchema = updateSchemaOf(lotCreateSchema);

/** Ready pieces leaving the factory: where to, and how many of each size (a part is fine). */
export const dispatchOutSchema = z.object({
  party: trimmed(120),
  sizes: z
    .array(z.object({ size: trimmed(20), qty: z.coerce.number().int().min(0) }))
    .min(1, "Enter the pieces per size")
    .max(50)
    .refine((rows) => new Set(rows.map((r) => r.size)).size === rows.length, "Sizes must be unique"),
  note: optionalText(300),
});

// ---- Fabric khata (fabric received from the store; used fabric comes from the lots) ---------------------
const requiredDay = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a yyyy-mm-dd date");

export const fabricReceiptSchema = z.object({
  day: requiredDay,
  name: trimmed(120),
  qty: money.refine((n) => n > 0, "Quantity must be more than 0"),
  rolls: z.coerce.number().int().min(0).max(100000).optional(), // how many rolls the quantity came in
  unit: z.enum(FABRIC_UNITS).default("m"),
  holderId: objectId.optional(), // admin only: the cutting master who got the fabric (default: whoever records it)
  note: optionalText(300),
});

export const fabricReceiptUpdateSchema = updateSchemaOf(fabricReceiptSchema);

export const fabricQuerySchema = z.object({
  holderId: objectId.optional(),
  fabric: z.string().trim().max(200).optional(),
  from: dayString,
  to: dayString,
});

export const cuttingReportQuerySchema = z.object({
  day: requiredDay,
  holderId: objectId.optional(),
});

// ---- Attendance (one mark per worker per day) -----------------------------------------------------------
/** `status: ""` clears the worker's mark for that day. */
export const attendanceSaveSchema = z.object({
  day: requiredDay,
  marks: z
    .array(z.object({ workerId: objectId, status: z.enum([...ATTENDANCE_STATUSES, ""]) }))
    .min(1, "Mark at least one worker")
    .max(500)
    .refine((marks) => new Set(marks.map((m) => m.workerId)).size === marks.length, "A worker can only appear once"),
});

export const attendanceDayQuerySchema = z.object({ day: requiredDay });

export const attendanceMonthQuerySchema = z.object({
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a yyyy-mm month"),
});

export const lotStageActionSchema = z.object({
  action: z.enum(["send_stitching", "stitched", "washed", "ready"]),
  qty: z.coerce.number().int().min(0).optional(),
  // ready only: pieces per size that go into stock (must add up to qty); omitted = proportional split
  sizes: z.array(lotSizeSchema).max(50).optional(),
  washType: optionalText(80), // stitched only: printed on the washing gate pass
  note: optionalText(500),
});

export const gatePassIssueSchema = z.object({
  type: z.enum(ISSUABLE_GATE_PASS_TYPES),
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
  rate: nonNegative, // Rs per piece (a category's rate card can set its own)
  stage: z.enum(MAIN_OPERATIONS).default("stitching"), // the main operation it is part of
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const operationUpdateSchema = z.object({
  name: trimmed(80).optional(),
  rate: nonNegative.optional(),
  stage: z.enum(MAIN_OPERATIONS).optional(),
  order: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

/** A category's rate card: the operations it needs and the rate of each. An empty list removes the card. */
export const rateCardSchema = z.object({
  items: z
    .array(z.object({ operationId: objectId, rate: nonNegative }))
    .max(200)
    .refine(
      (items) => new Set(items.map((i) => i.operationId)).size === items.length,
      "An operation can only appear once"
    ),
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
