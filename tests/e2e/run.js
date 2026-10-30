/**
 * End-to-end tests: builds the app, boots a dedicated `next start` server on port 3100 against an
 * isolated database (MONGODB_DB=crm-e2e), then exercises the real API and the real UI (Edge via Playwright).
 *
 *   npm run test:e2e
 *
 * Needs .env with MONGODB_URI, AUTH_SECRET, FIRST_USER_NAME, FIRST_USER_PASS. Never touches the
 * production database: every scenario runs on crm-e2e and cleans up what it created.
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { request, chromium } = require("playwright");
const { MongoClient } = require("mongodb");

const ROOT = path.resolve(__dirname, "..", "..");
const PORT = Number(process.env.E2E_PORT || 3100);
const BASE = `http://localhost:${PORT}`;
const DB = process.env.E2E_DB || "crm-e2e";

// ---------- env ----------
function loadEnv() {
  const file = path.join(ROOT, ".env");
  const env = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...env, ...process.env };
}
const ENV = loadEnv();
// E2E_MONGODB_URI (optional): alternative connection string for the test run, e.g. a plain `mongodb://host1,host2,…`
// URI on machines whose resolver cannot answer the Atlas `mongodb+srv` SRV/TXT lookups. Same cluster, same credentials.
if (ENV.E2E_MONGODB_URI) ENV.MONGODB_URI = ENV.E2E_MONGODB_URI;
for (const key of ["MONGODB_URI", "AUTH_SECRET", "FIRST_USER_NAME", "FIRST_USER_PASS"]) {
  if (!ENV[key]) {
    console.error(`Missing ${key} in .env`);
    process.exit(1);
  }
}

// ---------- tiny test runner ----------
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const results = [];
function expect(actual, message) {
  return {
    toBe(expected) {
      if (actual !== expected)
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`${message}: expected truthy, got ${JSON.stringify(actual)}`);
    },
    toContain(part) {
      if (!String(actual).includes(part))
        throw new Error(`${message}: expected to contain ${JSON.stringify(part)}, got ${JSON.stringify(actual)}`);
    },
    // Plain data (arrays / objects of numbers and strings): equal when they serialise the same.
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined) throw new Error(`${message}: expected undefined, got ${JSON.stringify(actual)}`);
    },
  };
}

// ---------- server lifecycle ----------
let server;
async function waitForServer(ms = 180_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Dev server did not start in time");
}

function runBuild() {
  // A second `next dev` is refused while the normal dev server runs, so e2e uses a production
  // build + `next start` on its own port (the build does not depend on the database name).
  if (process.env.E2E_SKIP_BUILD === "1" && fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) return;
  console.log("building (next build)…");
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const res = spawnSync(process.execPath, [nextBin, "build"], { cwd: ROOT, env: ENV, stdio: "pipe", encoding: "utf8" });
  if (res.status !== 0) {
    console.error(res.stdout?.slice(-2000), res.stderr?.slice(-2000));
    throw new Error("next build failed");
  }
}

function startServer() {
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...ENV, MONGODB_DB: DB, PORT: String(PORT), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = fs.createWriteStream(path.join(ROOT, "tests", "e2e", "server.log"));
  server.stdout.pipe(log);
  server.stderr.pipe(log);
}

function stopServer() {
  if (!server) return;
  if (process.platform === "win32") spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}

async function dropTestDb() {
  try {
    const client = new MongoClient(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
    await client.connect();
    await client.db(DB).dropDatabase();
    await client.close();
    return true;
  } catch (err) {
    console.warn(`(could not drop ${DB} directly: ${err.message}; relying on API cleanup)`);
    return false;
  }
}

// ---------- API helpers ----------
async function api(ctx, method, url, data) {
  const res = await ctx.fetch(`${BASE}${url}`, { method, data, maxRedirects: 0, failOnStatusCode: false });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not json */
  }
  return { status: res.status(), body, headers: res.headers() };
}

async function login(username, password) {
  const ctx = await request.newContext({ baseURL: BASE });
  const res = await api(ctx, "POST", "/api/auth/login", { username, password });
  if (res.status !== 200) throw new Error(`login failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return ctx;
}

// ---------- shared state ----------
/** "yyyy-mm-dd" of today + `offset` days in local time (the server runs on this machine, same time zone). */
const localDay = (offset = 0) => {
  const at = new Date();
  at.setDate(at.getDate() + offset);
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
};

const S = {
  admin: null,
  cutter: null,
  cutter2: null,
  ids: {
    users: [],
    products: [],
    lots: [],
    sales: [],
    purchases: [],
    vendors: [],
    ledger: [],
    workers: [],
    operations: [],
  },
};

// =====================================================================
// API scenarios
// =====================================================================
test("admin logs in with bootstrap credentials and has the admin role", async () => {
  S.admin = await login(ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  const me = await api(S.admin, "GET", "/api/profile");
  expect(me.status, "profile status").toBe(200);
  expect(me.body.role, "role").toBe("admin");
  const users = await api(S.admin, "GET", "/api/users");
  expect(users.status, "users status").toBe(200);
  expect(Array.isArray(users.body), "users list").toBe(true);
});

test("admin creates a cutting master and a second one", async () => {
  for (const name of ["e2e-cutter", "e2e-cutter-2"]) {
    const res = await api(S.admin, "POST", "/api/users", {
      name,
      email: `${name}@test.local`,
      password: "cutter123",
      role: "cutting_master",
    });
    expect(res.status, `create ${name}`).toBe(201);
    expect(res.body.role, "role").toBe("cutting_master");
    S.ids.users.push(res.body._id);
  }
  const dup = await api(S.admin, "POST", "/api/users", {
    name: "e2e-cutter",
    password: "cutter123",
    role: "cutting_master",
  });
  expect(dup.status, "duplicate user").toBe(409);
});

test("cutting master is limited to the cutting portal", async () => {
  S.cutter = await login("e2e-cutter", "cutter123");
  S.cutter2 = await login("e2e-cutter-2", "cutter123");
  expect((await api(S.cutter, "GET", "/api/sales")).status, "sales api").toBe(403);
  expect((await api(S.cutter, "GET", "/api/users")).status, "users api").toBe(403);
  expect((await api(S.cutter, "GET", "/api/lots/summary")).status, "summary api").toBe(403);
  expect((await api(S.cutter, "GET", "/api/products")).status, "products api").toBe(200);
  expect((await api(S.cutter, "GET", "/api/lots")).status, "lots api").toBe(200);
  expect(
    (await api(S.cutter, "POST", "/api/products", { name: "x", category: "y", purchasePrice: 1, salePrice: 2 })).status,
    "products POST"
  ).toBe(403);
  const page = await api(S.cutter, "GET", "/sales");
  expect(page.status, "sales page redirect").toBe(307);
  expect(page.headers.location, "redirect target").toContain("/cutting");
});

test("admin creates a product with sizes; totals are derived", async () => {
  const res = await api(S.admin, "POST", "/api/products", {
    name: "E2E Slim Fit Denim",
    category: "Pents",
    purchasePrice: 900,
    salePrice: 1500,
    sizes: [
      { size: "30", remaining: 5 },
      { size: "32", remaining: 7 },
    ],
  });
  expect(res.status, "create product").toBe(201);
  expect(res.body.remaining, "derived total").toBe(12);
  S.ids.products.push(res.body._id);
  S.productId = res.body._id;
});

test("cutting master creates, reads and edits a lot; events are recorded", async () => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 62, unit: "m" },
    sizes: [
      { size: "30", qty: 30 },
      { size: "32", qty: 40 },
    ],
    note: "e2e",
  });
  expect(created.status, "create lot").toBe(201);
  expect(created.body.lotNumber, "lot number").toBe("INV-1001");
  expect(created.body.cutQty, "cut qty").toBe(70);
  expect(created.body.stage, "stage").toBe("cutting");
  S.lotId = created.body._id;
  S.ids.lots.push(S.lotId);

  const detail = await api(S.cutter, "GET", `/api/lots/${S.lotId}`);
  expect(detail.status, "detail").toBe(200);
  expect(detail.body.events.map((e) => e.type).join(","), "events").toBe("created");

  expect(created.body.gatePasses?.[0]?.type, "cutting pass with the entry").toBe("cutting");
  expect(created.body.gatePasses[0].pieces, "cutting pass pieces").toBe(70);

  const edited = await api(S.cutter, "PUT", `/api/lots/${S.lotId}`, {
    sizes: [
      { size: "30", qty: 30 },
      { size: "32", qty: 45 },
    ],
  });
  expect(edited.status, "edit").toBe(200);
  expect(edited.body.cutQty, "cut qty after edit").toBe(75);
  expect(edited.body.gatePasses.map((p) => `${p.type}:${p.pieces}`).join(), "fresh cutting pass").toBe("cutting:75");
  const noteOnly = await api(S.cutter, "PUT", `/api/lots/${S.lotId}`, { note: "note only" });
  expect(noteOnly.body.gatePasses.length, "note edit keeps the pass").toBe(0);
  const cuttingPasses = (await api(S.cutter, "GET", `/api/lots/${S.lotId}/gate-passes`)).body;
  expect(cuttingPasses.map((p) => `${p.type}:${p.pieces}`).join(), "both cutting passes kept").toBe(
    "cutting:70,cutting:75"
  );
  const after = await api(S.cutter, "GET", `/api/lots/${S.lotId}`);
  expect(after.body.events.map((e) => e.type).join(","), "events after edit").toBe("created,edited,edited");

  const second = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim", qty: 10 },
    sizes: [{ size: "34", qty: 10 }],
  });
  expect(second.body.lotNumber, "sequence").toBe("INV-1002");
  S.ids.lots.push(second.body._id);
});

test("other cutting masters cannot see the lot; only admin can delete it", async () => {
  expect((await api(S.cutter2, "GET", `/api/lots/${S.lotId}`)).status, "other cutter detail").toBe(403);
  const mine = await api(S.cutter2, "GET", "/api/lots");
  expect(mine.body.length, "other cutter list").toBe(0);
  expect((await api(S.cutter, "DELETE", `/api/lots/${S.lotId}`)).status, "cutter delete").toBe(403);

  const summary = await api(S.admin, "GET", "/api/lots/summary");
  expect(summary.status, "summary").toBe(200);
  expect(summary.body.stages.cutting.count, "cutting count").toBe(2);
  expect(summary.body.inProcess, "in process").toBe(2);

  const all = await api(S.admin, "GET", "/api/lots");
  expect(all.body.length, "admin sees all lots").toBe(2);
  const own = await api(S.admin, "GET", "/api/lots?mine=1");
  expect(own.body.length, "admin mine=1").toBe(0);

  expect(
    (await api(S.admin, "DELETE", `/api/products/${S.productId}`)).status,
    "product with lots cannot be deleted"
  ).toBe(409);
});

test("sales deduct per size and restore on delete; purchases add per size", async () => {
  const sale = await api(S.admin, "POST", "/api/sales", {
    invoiceNumber: 1,
    customerName: "E2E Customer",
    items: [{ desc: "E2E Slim Fit Denim", qty: 2, price: 1500, productId: S.productId, size: "32" }],
    total: 3000,
    subTotal: 3000,
    receivedAmount: 3000,
    balance: 0,
  });
  expect(sale.status, "create sale").toBe(201);
  S.ids.sales.push(sale.body._id);
  let product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining, "total after sale").toBe(10);
  expect(product.sizes.find((s) => s.size === "32").remaining, "size 32 after sale").toBe(5);

  expect((await api(S.admin, "DELETE", `/api/sales/${sale.body._id}`)).status, "delete sale").toBe(200);
  S.ids.sales = [];
  product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining, "total restored").toBe(12);

  const vendor = await api(S.admin, "POST", "/api/vendors", { name: "E2E Vendor" });
  S.ids.vendors.push(vendor.body._id);
  const purchase = await api(S.admin, "POST", "/api/purchases", {
    productId: S.productId,
    vendorId: vendor.body._id,
    quantity: 3,
    costPerItem: 800,
    size: "34",
  });
  expect(purchase.status, "purchase").toBe(201);
  S.ids.purchases.push(purchase.body._id);
  product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining, "total after purchase").toBe(15);
  expect(product.sizes.find((s) => s.size === "34").remaining, "new size 34").toBe(3);
});

test("Purchasing ledger: purchases and vendor payments with a running balance", async () => {
  const vendorId = S.ids.vendors[0]; // "E2E Vendor" with one purchase of 3 × 800 = 2,400
  expect((await api(S.cutter, "GET", "/api/purchases/ledger")).status, "cutter forbidden").toBe(403);
  expect((await api(S.admin, "POST", "/api/vendor-payments", { vendorId, amount: 0 })).status, "zero payment").toBe(
    400
  );
  const pay = await api(S.admin, "POST", "/api/vendor-payments", {
    vendorId,
    amount: 1000,
    method: "cheque",
    note: "chq 12",
  });
  expect(pay.status, "payment").toBe(201);
  expect(pay.body.vendorName, "vendor name snapshot").toBe("E2E Vendor");

  const ledger = await api(S.admin, "GET", `/api/purchases/ledger?vendorId=${vendorId}`);
  expect(ledger.status, "ledger").toBe(200);
  expect(ledger.body.rows.map((r) => `${r.kind}:${r.balance}`).join(","), "running balance").toBe(
    "purchase:2400,payment:1400"
  );
  expect(ledger.body.totals.closing, "payable").toBe(1400);
  const balance = ledger.body.balances.find((b) => b.vendorId === vendorId);
  expect(balance.balance, "vendor balance").toBe(1400);

  // A period after today: everything moves into the opening balance.
  const later = await api(S.admin, "GET", `/api/purchases/ledger?vendorId=${vendorId}&from=2099-01-01&to=2099-01-31`);
  expect(later.body.opening, "opening").toBe(1400);
  expect(later.body.rows.length, "no rows in the future").toBe(0);
  expect((await api(S.admin, "GET", "/api/purchases/ledger?from=26-10-2026")).status, "bad date").toBe(400);

  expect((await api(S.admin, "DELETE", `/api/vendors/${vendorId}`)).status, "vendor with payments").toBe(409);
  expect((await api(S.admin, "DELETE", `/api/vendor-payments/${pay.body._id}`)).status, "delete payment").toBe(200);
  const after = await api(S.admin, "GET", `/api/purchases/ledger?vendorId=${vendorId}`);
  expect(after.body.totals.closing, "payable after delete").toBe(2400);
});

test("admin account protections", async () => {
  const me = (await api(S.admin, "GET", "/api/profile")).body;
  expect((await api(S.admin, "PUT", `/api/users/${me._id}`, { active: false })).status, "self deactivate").toBe(400);
  expect((await api(S.admin, "DELETE", `/api/users/${me._id}`)).status, "self delete").toBe(400);
});

test("Phase 2: admin moves a lot cutting → stitching → washing → packing with quantity limits", async () => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 10 },
    sizes: [
      { size: "30", qty: 60 },
      { size: "32", qty: 60 },
    ],
    note: "phase2",
  });
  expect(created.status, "create").toBe(201);
  const id = created.body._id;
  S.ids.lots.push(id);
  S.stageLotId = id;

  expect(
    (await api(S.cutter, "POST", `/api/lots/${id}/stage`, { action: "send_stitching" })).status,
    "cutter forbidden"
  ).toBe(403);
  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "stitched", qty: 5 })).status,
    "wrong order"
  ).toBe(409);

  let res = await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "send_stitching" });
  expect(res.status, "send_stitching").toBe(200);
  expect(res.body.stage, "stage after send").toBe("stitching");

  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "stitched", qty: 121 })).status,
    "too many"
  ).toBe(409);
  res = await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "stitched", qty: 118, note: "2 damaged" });
  expect(res.status, "stitched").toBe(200);
  expect(res.body.stage, "stage after stitched").toBe("washing");
  expect(res.body.stitchedQty, "stitchedQty").toBe(118);

  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "washed", qty: 119 })).status,
    "washed too many"
  ).toBe(409);
  res = await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "washed", qty: 117 });
  expect(res.status, "washed").toBe(200);
  expect(res.body.stage, "stage after washed").toBe("packing");
  expect(res.body.events.map((e) => e.type).join(","), "history").toBe("created,sent_stitching,stitched,washed");

  expect((await api(S.admin, "DELETE", `/api/lots/${id}`)).status, "no delete after cutting").toBe(409);
  expect((await api(S.cutter, "PUT", `/api/lots/${id}`, { note: "x" })).status, "no edit after cutting").toBe(409);
});

test("Phase 2: lot report totals, stage buckets and CSV", async () => {
  const report = await api(S.admin, "GET", "/api/lots/report?filter=today");
  expect(report.status, "report").toBe(200);
  expect(report.body.byStage.packing.count >= 1, "packing bucket").toBe(true);
  const row = report.body.lots.find((l) => l.cutQty === 120 && l.stage === "Packing");
  expect(Boolean(row), "report row").toBe(true);
  expect(row.shortfall, "shortfall").toBe(3);
  expect((await api(S.cutter, "GET", "/api/lots/report")).status, "cutter forbidden").toBe(403);

  const csv = await S.admin.fetch(`${BASE}/api/lots/report?filter=today&format=csv`);
  expect(csv.status(), "csv status").toBe(200);
  expect(csv.headers()["content-type"], "csv type").toContain("text/csv");
  expect(await csv.text(), "csv body").toContain('"Invoice #"');
});

test("Phase 3: Ready for Sale adds stock per size once, reverse takes it back", async () => {
  const id = S.stageLotId; // at packing: cut 120, stitched 118, washed 117 (sizes 30/32 = 60/60)
  const before = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);

  expect(
    (await api(S.cutter, "POST", `/api/lots/${id}/stage`, { action: "ready", qty: 117 })).status,
    "cutter forbidden"
  ).toBe(403);
  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "ready", qty: 118 })).status,
    "more than washed"
  ).toBe(409);
  expect(
    (
      await api(S.admin, "POST", `/api/lots/${id}/stage`, {
        action: "ready",
        qty: 117,
        sizes: [
          { size: "30", qty: 100 },
          { size: "32", qty: 10 },
        ],
      })
    ).status,
    "sizes must add up"
  ).toBe(409);

  const ready = await api(S.admin, "POST", `/api/lots/${id}/stage`, {
    action: "ready",
    qty: 117,
    sizes: [
      { size: "30", qty: 58 },
      { size: "32", qty: 59 },
    ],
  });
  expect(ready.status, "ready").toBe(200);
  expect(ready.body.stage, "stage").toBe("ready");
  expect(ready.body.stockApplied, "stockApplied").toBe(true);
  expect(ready.body.events.map((e) => e.type).pop(), "last event").toBe("ready");

  let product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining - before.remaining, "total added").toBe(117);
  expect(
    product.sizes.find((s) => s.size === "30").remaining - before.sizes.find((s) => s.size === "30").remaining,
    "size 30"
  ).toBe(58);
  expect(
    product.sizes.find((s) => s.size === "32").remaining - before.sizes.find((s) => s.size === "32").remaining,
    "size 32"
  ).toBe(59);
  expect(product.lastProduction?.lotNumber, "last production badge").toBe(ready.body.lotNumber);

  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "ready", qty: 117 })).status,
    "second ready refused"
  ).toBe(409);

  const movements = await api(S.admin, "GET", `/api/stock-movements?lotId=${id}`);
  expect(movements.status, "movements").toBe(200);
  expect(
    movements.body.filter((m) => m.reason === "lot_ready").reduce((s, m) => s + m.qty, 0),
    "movement total"
  ).toBe(117);

  expect((await api(S.admin, "POST", `/api/lots/${id}/reverse`, {})).status, "reason required").toBe(400);
  const reversed = await api(S.admin, "POST", `/api/lots/${id}/reverse`, { reason: "Counted wrong" });
  expect(reversed.status, "reverse").toBe(200);
  expect(reversed.body.stage, "back to packing").toBe("packing");
  expect(reversed.body.stockApplied, "stock flag cleared").toBe(false);
  product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining, "stock restored").toBe(before.remaining);
  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/reverse`, { reason: "again" })).status,
    "second reverse refused"
  ).toBe(409);

  // can be marked ready again after a reverse (proportional split when sizes omitted)
  const again = await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "ready", qty: 100 });
  expect(again.status, "ready again").toBe(200);
  expect(
    again.body.readySizes.reduce((s, r) => s + r.qty, 0),
    "proportional split"
  ).toBe(100);
  product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(product.remaining - before.remaining, "total added again").toBe(100);
});

test("Phase 4: ledger register — CRUD with history, filters, CSV; stock never changes", async () => {
  const before = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect((await api(S.cutter, "GET", "/api/ledger")).status, "cutter forbidden").toBe(403);
  expect((await api(S.admin, "POST", "/api/ledger", { type: "scrap", item: "x", qty: 1 })).status, "bad type").toBe(
    400
  );
  expect((await api(S.admin, "POST", "/api/ledger", { type: "bpair", item: "x", qty: 0 })).status, "zero qty").toBe(
    400
  );
  expect(
    (await api(S.admin, "POST", "/api/ledger", { type: "bpair", item: "x", qty: 1, lotId: "64b000000000000000000001" }))
      .status,
    "unknown lot"
  ).toBe(404);

  const linked = await api(S.admin, "POST", "/api/ledger", {
    type: "bpair",
    item: "E2E Slim Fit Denim",
    qty: 3,
    lotId: S.stageLotId,
    note: "shortfall",
  });
  expect(linked.status, "create linked").toBe(201);
  expect(linked.body.lotNumber, "lot number resolved").toBeTruthy();
  expect(linked.body.unit, "default unit").toBe("pcs");
  const zip = await api(S.admin, "POST", "/api/ledger", { type: "accessory", item: "YKK zip", qty: 40 });
  const fabric = await api(S.admin, "POST", "/api/ledger", {
    type: "fabric",
    item: "Denim 12oz leftover",
    qty: 4.5,
    unit: "m",
  });
  S.ids.ledger.push(linked.body._id, zip.body._id, fabric.body._id);

  const all = await api(S.admin, "GET", "/api/ledger");
  expect(all.body.entries.length, "entries").toBe(3);
  expect(all.body.totals.byType.bpair.qty, "bpair total").toBe(3);
  expect(all.body.totals.byType.fabric.qty, "fabric total").toBe(4.5);
  expect((await api(S.admin, "GET", "/api/ledger?type=fabric")).body.entries.length, "type filter").toBe(1);
  expect((await api(S.admin, "GET", "/api/ledger?search=ykk")).body.entries[0].item, "search").toBe("YKK zip");
  expect((await api(S.admin, "GET", `/api/ledger?lotId=${S.stageLotId}`)).body.entries.length, "lot filter").toBe(1);

  expect(
    (await api(S.admin, "PUT", `/api/ledger/${linked.body._id}`, { qty: 2, note: "recount" })).status,
    "edit"
  ).toBe(200);
  let one = (await api(S.admin, "GET", `/api/ledger/${linked.body._id}`)).body;
  expect(one.qty, "qty after edit").toBe(2);
  expect(one.unit, "unit kept on partial edit").toBe("pcs");
  expect(one.history.length, "history").toBe(1);
  expect(one.history[0].before.qty, "history before").toBe(3);
  expect(one.history[0].after.note, "history after").toBe("recount");
  await api(S.admin, "PUT", `/api/ledger/${linked.body._id}`, { lotId: null });
  one = (await api(S.admin, "GET", `/api/ledger/${linked.body._id}`)).body;
  expect(one.lotNumber, "unlinked").toBe(null);
  expect(one.history.length, "history after unlink").toBe(2);

  const csv = await S.admin.fetch(`${BASE}/api/ledger?format=csv`);
  expect(csv.status(), "csv").toBe(200);
  expect(await csv.text(), "csv body").toContain('"Invoice #"');

  expect((await api(S.admin, "DELETE", `/api/ledger/${fabric.body._id}`)).status, "delete").toBe(200);
  S.ids.ledger = S.ids.ledger.filter((id) => id !== fabric.body._id);
  expect((await api(S.admin, "GET", `/api/ledger/${fabric.body._id}`)).status, "gone").toBe(404);

  const after = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(after.remaining, "stock untouched").toBe(before.remaining);
  const movements = await api(S.admin, "GET", `/api/stock-movements?productId=${S.productId}`);
  expect(
    movements.body.some((m) => String(m.reason).includes("ledger")),
    "no stock movement from the register"
  ).toBe(false);
});

test("Phase 5: unsized product switches to per-size stock; widget and analytics report produced pieces", async () => {
  const cap = await api(S.admin, "POST", "/api/products", {
    name: "E2E Plain Cap",
    category: "Caps",
    purchasePrice: 100,
    salePrice: 200,
    remaining: 20,
  });
  expect(cap.status, "create unsized").toBe(201);
  S.ids.products.push(cap.body._id);
  expect(Array.isArray(cap.body.sizes) && cap.body.sizes.length > 0, "no sizes yet").toBe(false);

  const switched = await api(S.admin, "PUT", `/api/products/${cap.body._id}`, {
    sizes: [
      { size: "S", remaining: 8 },
      { size: "M", remaining: 12 },
    ],
  });
  expect(switched.status, "enable sizes").toBe(200);
  const product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === cap.body._id);
  expect(product.sizes.length, "sizes stored").toBe(2);
  expect(product.remaining, "total derived from sizes").toBe(20);

  const summary = await api(S.admin, "GET", "/api/lots/summary");
  expect(summary.status, "summary").toBe(200);
  expect(summary.body.readyToday.count >= 1, "ready today count").toBe(true);
  expect(summary.body.readyToday.pieces >= 100, "ready today pieces").toBe(true);
  expect(summary.body.producedThisMonth, "net produced (117 added, 117 reversed, 100 added)").toBe(100);

  const analytics = await api(S.admin, "GET", "/api/analytics?filter=today");
  expect(analytics.status, "analytics").toBe(200);
  expect(analytics.body.producedPieces, "produced pieces in analytics").toBe(100);
});

test("Phase 6: operations with rates, workers, work assignment per lot and the wages report", async () => {
  expect((await api(S.cutter, "GET", "/api/workers")).status, "cutter forbidden").toBe(403);
  const belt = await api(S.admin, "POST", "/api/operations", { name: "E2E Belt", rate: 3.5 });
  const pocket = await api(S.admin, "POST", "/api/operations", { name: "E2E Pocket", rate: "4" });
  expect(belt.status, "create operation").toBe(201);
  S.ids.operations.push(belt.body._id, pocket.body._id);
  expect((await api(S.admin, "POST", "/api/operations", { name: "E2E Belt", rate: 1 })).status, "dup op").toBe(409);
  const ops = await api(S.admin, "GET", "/api/operations");
  expect(ops.body.perPiece, "labour per piece").toBe(7.5);

  const akram = await api(S.admin, "POST", "/api/workers", { name: "E2E Akram", phone: "0300" });
  const bilal = await api(S.admin, "POST", "/api/workers", { name: "E2E Bilal", dailyRate: 100 });
  expect(akram.status, "create worker").toBe(201);
  expect(akram.body.type, "default type").toBe("stitching");
  S.ids.workers.push(akram.body._id, bilal.body._id);

  const lotId = S.stageLotId; // cut 120
  const bad = await api(S.admin, "POST", "/api/work-entries", {
    lotId,
    operationId: belt.body._id,
    rows: [
      { workerId: akram.body._id, pieces: 60 },
      { workerId: akram.body._id, pieces: 60 },
    ],
  });
  expect(bad.status, "same worker twice").toBe(400);
  const assigned = await api(S.admin, "POST", "/api/work-entries", {
    lotId,
    operationId: belt.body._id,
    rows: [
      { workerId: akram.body._id, pieces: 60 },
      { workerId: bilal.body._id, pieces: 60 },
    ],
  });
  expect(assigned.status, "assign").toBe(201);
  expect(assigned.body.length, "two entries").toBe(2);
  expect(assigned.body[0].amount, "60 x 3.5").toBe(210);
  expect(assigned.body[0].lotNumber, "lot snapshot").toBeTruthy();
  const custom = await api(S.admin, "POST", "/api/work-entries", {
    lotId,
    operationId: pocket.body._id,
    rate: 4.5,
    rows: [{ workerId: akram.body._id, pieces: 120 }],
  });
  expect(custom.body[0].amount, "custom rate 120 x 4.5").toBe(540);

  // changing the operation's rate never rewrites saved entries
  expect((await api(S.admin, "PUT", `/api/operations/${belt.body._id}`, { rate: 10 })).status, "rate change").toBe(200);
  const lotEntries = await api(S.admin, "GET", `/api/work-entries?lotId=${lotId}`);
  expect(lotEntries.body.length, "lot entries").toBe(3);
  expect(
    lotEntries.body.every((e) => e.operationName !== "E2E Belt" || e.rate === 3.5),
    "old rate kept"
  ).toBe(true);

  const edited = await api(S.admin, "PUT", `/api/work-entries/${assigned.body[1]._id}`, { pieces: 50 });
  expect(edited.status, "edit entry").toBe(200);
  const adv = await api(S.admin, "POST", "/api/wage-adjustments", {
    workerId: akram.body._id,
    type: "advance",
    amount: 200,
  });
  expect(adv.status, "advance").toBe(201);
  // Advance account (client, 2026-10-24): an advance is cut only when an "Advance cut" is recorded, never more
  // than what is left; the rest carries forward.
  expect(
    (await api(S.admin, "POST", "/api/wage-adjustments", { workerId: akram.body._id, type: "recovery", amount: 300 }))
      .status,
    "cut more than the advance left"
  ).toBe(409);
  const cut = await api(S.admin, "POST", "/api/wage-adjustments", {
    workerId: akram.body._id,
    type: "recovery",
    amount: 150,
  });
  expect(cut.status, "advance cut").toBe(201);
  const leave = await api(S.admin, "POST", "/api/wage-adjustments", {
    workerId: bilal.body._id,
    type: "leave",
    days: 0.5,
  });
  expect(leave.status, "leave").toBe(201);
  expect(leave.body.rate, "leave rate from the worker's per-day salary").toBe(100);
  expect(leave.body.amount, "half day x 100").toBe(50);
  expect(
    (await api(S.admin, "POST", "/api/wage-adjustments", { workerId: bilal.body._id, type: "leave" })).status,
    "leave needs days"
  ).toBe(400);

  const report = await api(S.admin, "GET", "/api/wages/report?filter=thisweek");
  expect(report.status, "report").toBe(200);
  const a = report.body.workers.find((w) => w.workerName === "E2E Akram");
  const b = report.body.workers.find((w) => w.workerName === "E2E Bilal");
  expect(a.amount, "akram wages 210 + 540").toBe(750);
  expect(a.net, "akram net: the advance is not cut, only the 150 advance cut").toBe(600);
  expect(a.advances, "advance given in the period").toBe(200);
  expect(a.recoveries, "advance cut in the period").toBe(150);
  expect(a.advanceLeft, "advance left").toBe(50);
  expect(b.amount, "bilal 50 x 3.5").toBe(175);
  expect(b.leaveDays, "bilal leave days").toBe(0.5);
  expect(b.net, "bilal net after half-day leave").toBe(125);
  expect(report.body.totals.net, "total net").toBe(725);
  const khata = await api(S.admin, "GET", "/api/wages/advances");
  expect(khata.status, "advance accounts").toBe(200);
  const akramAccount = khata.body.accounts.find((acc) => acc.workerName === "E2E Akram");
  expect(akramAccount.balance, "khata balance").toBe(50);
  expect(akramAccount.history.map((h) => h.balance).join(","), "running balance").toBe("200,50");
  const only = await api(S.admin, "GET", `/api/wages/report?filter=thisweek&workerId=${bilal.body._id}`);
  expect(only.body.workers.length, "worker filter").toBe(1);
  const csv = await S.admin.fetch(`${BASE}/api/wages/report?filter=thisweek&format=csv`);
  expect(await csv.text(), "csv").toContain('"Net payable"');

  expect((await api(S.admin, "DELETE", `/api/workers/${akram.body._id}`)).status, "worker in use").toBe(409);
  expect((await api(S.admin, "DELETE", `/api/operations/${belt.body._id}`)).status, "operation in use").toBe(409);
  expect(
    (await api(S.admin, "DELETE", `/api/wage-adjustments/${adv.body._id}`)).status,
    "advance already partly cut"
  ).toBe(409);
  expect((await api(S.admin, "DELETE", `/api/wage-adjustments/${cut.body._id}`)).status, "delete advance cut").toBe(
    200
  );
  expect((await api(S.admin, "DELETE", `/api/wage-adjustments/${adv.body._id}`)).status, "delete advance").toBe(200);
  expect((await api(S.admin, "DELETE", `/api/wage-adjustments/${leave.body._id}`)).status, "delete leave").toBe(200);
  for (const entry of lotEntries.body) {
    expect((await api(S.admin, "DELETE", `/api/work-entries/${entry._id}`)).status, "delete entry").toBe(200);
  }
  expect((await api(S.admin, "GET", `/api/work-entries?lotId=${lotId}`)).body.length, "entries gone").toBe(0);
});

test("Attendance: present / absent / leave per day; absent and leave cut a day of the per-day salary", async () => {
  const today = localDay();
  const yesterday = localDay(-1);
  const workers = (await api(S.admin, "GET", "/api/workers")).body;
  const akram = workers.find((w) => w.name === "E2E Akram");
  const bilal = workers.find((w) => w.name === "E2E Bilal"); // per-day salary 100
  expect((await api(S.cutter, "GET", `/api/attendance?day=${today}`)).status, "cutter forbidden").toBe(403);

  const saved = await api(S.admin, "PUT", "/api/attendance", {
    day: today,
    marks: [
      { workerId: akram._id, status: "present" },
      { workerId: bilal._id, status: "absent" },
    ],
  });
  expect(saved.status, "mark").toBe(200);
  const bilalRow = saved.body.rows.find((r) => r.workerId === bilal._id);
  expect([bilalRow.status, bilalRow.cut], "absent cuts a day").toEqual(["absent", 100]);
  expect(saved.body.counts.present >= 1 && saved.body.counts.absent >= 1, "counts").toBe(true);
  expect(
    (
      await api(S.admin, "PUT", "/api/attendance", {
        day: yesterday,
        marks: [{ workerId: bilal._id, status: "leave" }],
      })
    ).status,
    "leave yesterday"
  ).toBe(200);

  const sheet = await api(S.admin, "GET", `/api/attendance?day=${today}`);
  expect(sheet.body.rows.find((r) => r.workerId === akram._id).status, "sheet keeps the marks").toBe("present");

  const report = await api(
    S.admin,
    "GET",
    `/api/wages/report?filter=custom&from=${yesterday}&to=${today}&workerId=${bilal._id}`
  );
  const b = report.body.workers[0];
  expect([b.absentDays, b.absents, b.leaveDays, b.leaves], "absent and leave days in the wages").toEqual([
    1, 100, 1, 100,
  ]);
  expect(b.net, "both days cut").toBe(b.amount - 200);
  const csv = await S.admin.fetch(`${BASE}/api/wages/report?filter=custom&from=${yesterday}&to=${today}&format=csv`);
  expect(await csv.text(), "csv has the absent column").toContain('"Absent cut"');

  const register = await api(S.admin, "GET", `/api/attendance/month?month=${yesterday.slice(0, 7)}`);
  expect(register.status, "month register").toBe(200);
  const row = register.body.rows.find((r) => r.workerId === bilal._id);
  expect(row.marks[yesterday], "register shows the leave").toBe("leave");
  expect((await api(S.admin, "GET", "/api/attendance/month?month=2026-13")).status, "bad month").toBe(400);

  // clearing a mark removes the cut
  const cleared = await api(S.admin, "PUT", "/api/attendance", {
    day: today,
    marks: [
      { workerId: akram._id, status: "" },
      { workerId: bilal._id, status: "" },
    ],
  });
  expect(cleared.body.rows.find((r) => r.workerId === bilal._id).status, "cleared").toBe("");
  await api(S.admin, "PUT", "/api/attendance", { day: yesterday, marks: [{ workerId: bilal._id, status: "" }] });
  const after = await api(
    S.admin,
    "GET",
    `/api/wages/report?filter=custom&from=${yesterday}&to=${today}&workerId=${bilal._id}`
  );
  expect((after.body.workers[0]?.absents ?? 0) + (after.body.workers[0]?.leaves ?? 0), "no cuts left").toBe(0);

  expect(
    (await api(S.admin, "PUT", "/api/attendance", { day: today, marks: [{ workerId: bilal._id, status: "sick" }] }))
      .status,
    "unknown status"
  ).toBe(400);
  expect(
    (
      await api(S.admin, "PUT", "/api/attendance", {
        day: today,
        marks: [{ workerId: "64b000000000000000000099", status: "present" }],
      })
    ).status,
    "unknown worker"
  ).toBe(400);
});

test("Rate cards: operations sit under main operations; a category's card decides what a lot offers and at which rate", async () => {
  const overlock = await api(S.admin, "POST", "/api/operations", { name: "E2E Overlock", rate: 3, stage: "stitching" });
  const wash = await api(S.admin, "POST", "/api/operations", { name: "E2E Wash", rate: 5, stage: "washing" });
  expect(overlock.status, "create operation").toBe(201);
  expect(wash.body.stage, "main operation stored").toBe("washing");
  S.ids.operations.push(overlock.body._id, wash.body._id);
  expect(
    (await api(S.admin, "POST", "/api/operations", { name: "E2E Odd", rate: 1, stage: "dancing" })).status,
    "unknown main operation"
  ).toBe(400);

  const product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  const category = product.category;
  const cards = await api(S.admin, "GET", "/api/operation-sets");
  expect(cards.status, "cards").toBe(200);
  expect(cards.body.categories.find((c) => c.category === category)?.items.length, "no card yet").toBe(0);
  expect((await api(S.cutter, "GET", "/api/operation-sets")).status, "cutter forbidden").toBe(403);

  const lotId = S.stageLotId;
  const before = await api(S.admin, "GET", `/api/lots/${lotId}/operations`);
  expect(before.body.fromCard, "no card: every operation").toBe(false);
  expect(
    before.body.operations.some((o) => o.name === "E2E Wash"),
    "all active offered"
  ).toBe(true);
  expect((await api(S.cutter, "GET", `/api/lots/${lotId}/operations`)).status, "cutter can't").toBe(403);

  const card = await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent(category)}`, {
    items: [
      { operationId: overlock.body._id, rate: 3.5 },
      { operationId: wash.body._id, rate: 6 },
    ],
  });
  expect(card.status, "save card").toBe(200);
  expect(card.body.perPiece, "labour per piece on the card").toBe(9.5);

  const offered = await api(S.admin, "GET", `/api/lots/${lotId}/operations`);
  expect(offered.body.fromCard, "card used").toBe(true);
  expect(offered.body.category, "the article's category").toBe(category);
  expect(
    offered.body.operations.map((o) => `${o.name}:${o.stage}:${o.rate}`).join(","),
    "card operations with card rates"
  ).toBe("E2E Overlock:stitching:3.5,E2E Wash:washing:6");

  const workers = (await api(S.admin, "GET", "/api/workers")).body;
  const akram = workers.find((w) => w.name === "E2E Akram");
  const work = await api(S.admin, "POST", "/api/work-entries", {
    lotId,
    operationId: overlock.body._id,
    rows: [{ workerId: akram._id, pieces: 10 }],
  });
  expect(work.body[0].rate, "no rate sent: the card's rate").toBe(3.5);
  expect(work.body[0].amount, "10 x 3.5").toBe(35);
  await api(S.admin, "DELETE", `/api/work-entries/${work.body[0]._id}`);

  // a deleted operation leaves the card; an empty card is removed
  expect((await api(S.admin, "DELETE", `/api/operations/${wash.body._id}`)).status, "delete wash").toBe(200);
  const afterDelete = (await api(S.admin, "GET", "/api/operation-sets")).body.categories.find(
    (c) => c.category === category
  );
  expect(afterDelete.items.map((i) => i.name).join(), "wash left the card").toBe("E2E Overlock");
  const baggy = await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent("E2E Baggy Pent")}`, {
    items: [{ operationId: overlock.body._id, rate: 4 }],
  });
  expect(baggy.body.category, "category with a space").toBe("E2E Baggy Pent");
  expect(
    (
      await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent(category)}`, {
        items: [{ operationId: "64b000000000000000000099", rate: 1 }],
      })
    ).status,
    "unknown operation"
  ).toBe(400);
  expect(
    (await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent(category)}`, { items: [] })).status,
    "remove card"
  ).toBe(200);
  await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent("E2E Baggy Pent")}`, { items: [] });
  expect((await api(S.admin, "GET", `/api/lots/${lotId}/operations`)).body.fromCard, "back to every operation").toBe(
    false
  );
});

test("Phase 7: gate passes are issued with the stage changes and carry bundle, sizes, shrinkage and wash", async () => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 40 },
    sizes: [
      { size: "30", qty: 50 },
      { size: "32", qty: 50 },
    ],
    bundleNumber: "B-7",
    shrinkage: "2 inch",
    note: "phase7",
  });
  expect(created.status, "create lot").toBe(201);
  expect(created.body.bundleNumber, "bundle stored").toBe("B-7");
  expect(created.body.shrinkage, "shrinkage stored as written").toBe("2 inch");
  const id = created.body._id;
  S.ids.lots.push(id);

  const atCutting = (await api(S.cutter, "GET", `/api/lots/${id}/gate-passes`)).body;
  expect(atCutting.map((p) => p.type).join(","), "cutting pass only").toBe("cutting");
  expect(atCutting[0].bundleNumber, "bundle on cutting pass").toBe("B-7");
  expect(atCutting[0].shrinkage, "shrinkage on cutting pass").toBe("2 inch");
  expect(atCutting[0].sizeRange, "sizes on cutting pass").toBe("30 – 32");
  expect(atCutting[0].pieces, "pieces on cutting pass").toBe(100);
  expect((await api(S.admin, "POST", `/api/lots/${id}/gate-passes`, { type: "stitching" })).status, "too early").toBe(
    409
  );

  const sent = await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "send_stitching" });
  expect(sent.status, "send_stitching").toBe(200);
  expect(sent.body.gatePasses.map((p) => p.type).join(","), "stitching pass issued").toBe("cutting,stitching");
  const stitchingPass = sent.body.gatePasses[1];
  expect(/^GP-\d{4,}$/.test(stitchingPass.number), "numbered").toBe(true);
  expect(stitchingPass.type, "type").toBe("stitching");
  expect(stitchingPass.pieces, "cut pieces").toBe(100);
  expect(stitchingPass.sizeRange, "size range").toBe("30 – 32");
  expect(stitchingPass.bundleNumber, "bundle on pass").toBe("B-7");
  expect(stitchingPass.shrinkage, "shrinkage on pass").toBe("2 inch");

  const stitched = await api(S.admin, "POST", `/api/lots/${id}/stage`, {
    action: "stitched",
    qty: 98,
    washType: "Enzyme wash",
  });
  expect(stitched.status, "stitched").toBe(200);
  expect(stitched.body.washType, "wash type kept on lot").toBe("Enzyme wash");
  const washingPass = stitched.body.gatePasses.find((p) => p.type === "washing");
  expect(washingPass.pieces, "stitched pieces on washing pass").toBe(98);
  expect(washingPass.washType, "wash type on pass").toBe("Enzyme wash");

  const list = await api(S.admin, "GET", `/api/lots/${id}/gate-passes`);
  expect(list.body.map((p) => p.type).join(","), "three separate passes").toBe("cutting,stitching,washing");
  // the cutting master never sees where the pieces went after cutting (client, 2026-10-29)
  const cutterList = await api(S.cutter, "GET", `/api/lots/${id}/gate-passes`);
  expect(cutterList.status, "owner can read").toBe(200);
  expect(cutterList.body.map((p) => p.type).join(","), "cutter: cutting gate pass only").toBe("cutting");
  const cutterLot = await api(S.cutter, "GET", `/api/lots/${id}`);
  expect(cutterLot.body.events.map((e) => e.type).join(","), "cutter: cutting history only").toBe("created");
  const adminLot = await api(S.admin, "GET", `/api/lots/${id}`);
  expect(adminLot.body.events.length > 1, "admin: the whole history").toBe(true);
  expect((await api(S.cutter2, "GET", `/api/lots/${id}/gate-passes`)).status, "other cutter").toBe(403);
  expect((await api(S.cutter, "POST", `/api/lots/${id}/gate-passes`, { type: "washing" })).status, "cutter issue").toBe(
    403
  );

  const reissue = await api(S.admin, "POST", `/api/lots/${id}/gate-passes`, {
    type: "washing",
    washType: "Random wash",
  });
  expect(reissue.status, "reissue").toBe(201);
  expect(reissue.body.washType, "new wash type").toBe("Random wash");
  expect(reissue.body.seq > washingPass.seq, "new number").toBe(true);
});

test("Phase 7b: pieces leave stitching in parts, each with a gate pass; the balance is tracked", async () => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 40 },
    sizes: [
      { size: "30", qty: 50 },
      { size: "32", qty: 50 },
    ],
    note: "phase7b",
  });
  expect(created.status, "create lot").toBe(201);
  const id = created.body._id;
  S.ids.lots.push(id);
  expect((await api(S.admin, "POST", `/api/lots/${id}/dispatch`, { pieces: 10 })).status, "not in stitching yet").toBe(
    409
  );
  await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "send_stitching" });

  const first = await api(S.admin, "POST", `/api/lots/${id}/dispatch`, { pieces: 40, washType: "Enzyme wash" });
  expect(first.status, "first part").toBe(200);
  expect(first.body.pass.pieces, "pass pieces").toBe(40);
  expect(first.body.pass.partial, "partial pass").toBe(true);
  expect(first.body.lot.stitchOutQty, "sent out").toBe(40);
  const summary = await api(S.admin, "GET", "/api/lots/summary");
  expect(summary.body.stitching.lying >= 60, "lying in stitching").toBe(true);

  expect((await api(S.admin, "POST", `/api/lots/${id}/dispatch`, { pieces: 70 })).status, "more than lying").toBe(409);
  expect((await api(S.cutter, "POST", `/api/lots/${id}/dispatch`, { pieces: 5 })).status, "cutter forbidden").toBe(403);
  expect((await api(S.admin, "POST", `/api/lots/${id}/dispatch`, { pieces: 0 })).status, "zero pieces").toBe(400);

  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "stitched", qty: 30 })).status,
    "close below what went out"
  ).toBe(409);
  const closed = await api(S.admin, "POST", `/api/lots/${id}/stage`, {
    action: "stitched",
    qty: 98,
    washType: "Enzyme wash",
  });
  expect(closed.status, "close stitching").toBe(200);
  expect(closed.body.stage, "to washing").toBe("washing");
  const washing = closed.body.gatePasses.filter((p) => p.type === "washing").map((p) => p.pieces);
  expect(washing.join(","), "partial 40 + final 58").toBe("40,58");
  expect(closed.body.events.map((e) => e.type).join(","), "history").toBe("created,sent_stitching,dispatched,stitched");
  expect((await api(S.admin, "POST", `/api/lots/${id}/dispatch`, { pieces: 1 })).status, "after close").toBe(409);
});

test("Phase 9: the dashboard API returns production, stock, spending and wages in one call", async () => {
  expect((await api(S.cutter, "GET", "/api/dashboard")).status, "cutter forbidden").toBe(403);
  const res = await api(S.admin, "GET", "/api/dashboard");
  expect(res.status, "dashboard").toBe(200);
  const d = res.body;
  const summary = (await api(S.admin, "GET", "/api/lots/summary")).body;
  expect(d.trend.length, "14 days in the trend").toBe(14);
  for (const stage of ["cutting", "stitching", "washing", "packing"]) {
    expect(d.production.stages[stage].lots, `${stage} lots match the lots summary`).toBe(summary.stages[stage].count);
  }
  expect(d.production.inProcess.lots, "in process").toBe(summary.inProcess);
  expect(d.production.stitching.lying, "lying in stitching").toBe(summary.stitching.lying);
  expect(d.production.producedThisMonth, "produced this month").toBe(summary.producedThisMonth);
  expect(d.production.cutToday.pieces, "cut today").toBe(summary.today.pieces);
  expect(d.trend.at(-1).cut, "today's bar = cut today").toBe(d.production.cutToday.pieces);
  // The Phase 7b lot sits at washing with 98 stitched pieces.
  expect(d.production.stages.washing.pieces >= 98, "pieces at washing").toBe(true);
  expect(d.activity.length > 0 && d.activity.every((e) => e.lotNumber), "activity with lot numbers").toBe(true);
  expect(d.gatePasses.length > 0, "recent gate passes").toBe(true);
  expect(d.stock.products >= 1, "stock totals").toBe(true);
  expect(typeof d.money.purchasesMonth, "spending").toBe("number");
  expect(typeof d.wages.advanceLeft, "advance left on the dashboard").toBe("number");
  expect(d.wages.week.pieces >= 0 && d.wages.activeWorkers >= 0, "wages this week").toBe(true);
});

test("logout invalidates the session", async () => {
  const ctx = await login("e2e-cutter", "cutter123");
  expect((await api(ctx, "POST", "/api/auth/logout")).status, "logout").toBe(200);
  expect((await api(ctx, "GET", "/api/lots")).status, "after logout").toBe(401);
});

// =====================================================================
// UI scenarios (Edge via Playwright)
// =====================================================================
async function browserLogin(page, username, password) {
  await page.goto(`${BASE}/login`);
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60_000 });
}

let browser;
const uiTest = (name, fn) =>
  test(name, async () => {
    browser = browser || (await chromium.launch({ channel: "msedge" }));
    const context = await browser.newContext({ viewport: { width: 1366, height: 800 } });
    const page = await context.newPage();
    try {
      await fn(page);
    } catch (err) {
      // E2E_SHOTS=<dir> keeps a screenshot of every failing UI test.
      if (process.env.E2E_SHOTS) {
        const file = path.join(process.env.E2E_SHOTS, `${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 80)}.png`);
        await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      }
      throw err;
    } finally {
      await context.close();
    }
  });

uiTest("UI: cutting master lands on the cutting portal and sees only its nav", async (page) => {
  await browserLogin(page, "e2e-cutter", "cutter123");
  expect(new URL(page.url()).pathname, "landing path").toBe("/cutting");
  await page.waitForSelector('[data-testid="nav-cutting"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="nav-sales"]').count(), "sales nav hidden").toBe(0);
  expect(await page.locator('[data-testid="nav-users"]').count(), "users nav hidden").toBe(0);
  await page.goto(`${BASE}/inventory`);
  await page.waitForURL((url) => url.pathname.startsWith("/cutting"), { timeout: 60_000 });
});

uiTest("UI: cutting master creates a lot from the form and lands on its detail page", async (page) => {
  await browserLogin(page, "e2e-cutter", "cutter123");
  await page.goto(`${BASE}/cutting/new`);
  const form = page.locator('[data-testid="lot-form"]');
  await form.waitFor({ timeout: 60_000 });
  // Only <main> may scroll: a page-level scroll means a second scrollbar next to it.
  const pageScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(pageScroll <= 0, `document scrolls by ${pageScroll}px (double scrollbar)`).toBe(true);
  await page.click('[data-testid="lot-form-product"]');
  await page.getByText("E2E Slim Fit Denim", { exact: true }).first().click();
  await page.fill('[data-testid="lot-form-fabric-name"]', "Denim 14oz");
  const firstQty = form.locator('[data-testid="lot-form-size-row"] input[type="number"]').first();
  await firstQty.fill("25");
  expect(await page.locator('[data-testid="lot-form-total"]').innerText(), "total").toContain("25");
  await page.click('[data-testid="lot-form-submit"]');
  await page.waitForURL((url) => /^\/cutting\/[a-f0-9]{24}$/.test(url.pathname), { timeout: 60_000 });
  await page.waitForSelector('[data-testid="lot-detail"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="lot-history-item"]').count(), "history").toBe(1);
  S.ids.lots.push(new URL(page.url()).pathname.split("/").pop());
  // the cutting gate pass is there right away, for the cutting master to print
  await page.waitForSelector('[data-testid="gate-pass-row"][data-type="cutting"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-row"]').count(), "one cutting pass").toBe(1);
  expect(await page.locator('[data-testid="gate-pass-replaced"]').count(), "nothing replaced").toBe(0);

  // the first lot's sizes were edited: its first cutting pass is marked old
  await page.goto(`${BASE}/cutting/${S.lotId}`);
  await page.waitForSelector('[data-testid="gate-pass-row"][data-type="cutting"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-row"]').count(), "two cutting passes").toBe(2);
  const latest = await page.locator('[data-testid="gate-pass-row"]').nth(1).getAttribute("data-number");
  expect(await page.locator('[data-testid="gate-pass-row"]').first().getAttribute("data-replaced"), "old").toBe("true");
  expect(await page.locator('[data-testid="gate-pass-replaced"]').innerText(), "points to the new pass").toContain(
    latest
  );
});

test("partial updates keep the fields that were not sent (customer city, product stock, lot bundle)", async () => {
  const customer = await api(S.admin, "POST", "/api/customers", {
    name: "E2E Partial",
    phone: "0300-1112223",
    city: "Lahore",
  });
  expect(customer.status, "create customer").toBe(201);
  const customerId = customer.body._id;
  expect((await api(S.admin, "PUT", `/api/customers/${customerId}`, { openingBalance: 250 })).status, "balance").toBe(
    200
  );
  const savedCustomer = (await api(S.admin, "GET", "/api/customers")).body.find((c) => c._id === customerId);
  expect(savedCustomer.city, "city kept after a balance edit").toBe("Lahore");
  expect(savedCustomer.openingBalance, "balance saved").toBe(250);
  await api(S.admin, "DELETE", `/api/customers/${customerId}`);

  const product = await api(S.admin, "POST", "/api/products", {
    name: "E2E Partial Shirt",
    category: "Shirts",
    purchasePrice: 400,
    salePrice: 700,
    remaining: 9,
  });
  expect(product.status, "create product").toBe(201);
  const edit = { name: "E2E Partial Shirt 2", category: "Shirts", purchasePrice: 450, salePrice: 750 };
  expect((await api(S.admin, "PUT", `/api/products/${product.body._id}`, edit)).status, "edit product").toBe(200);
  const savedProduct = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === product.body._id);
  expect(savedProduct.remaining, "stock kept after a name/price edit").toBe(9);
  expect(savedProduct.salePrice, "price saved").toBe(750);
  await api(S.admin, "DELETE", `/api/products/${product.body._id}`);

  const lot = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim", qty: 20 },
    sizes: [{ size: "30", qty: 10 }],
    bundleNumber: "B-9",
    shrinkage: 5,
    note: "partial",
  });
  const sizesOnly = await api(S.cutter, "PUT", `/api/lots/${lot.body._id}`, { sizes: [{ size: "30", qty: 12 }] });
  expect(sizesOnly.body.bundleNumber, "bundle kept after a sizes edit").toBe("B-9");
  expect(sizesOnly.body.note, "note kept").toBe("partial");
  expect(sizesOnly.body.gatePasses[0].bundleNumber, "fresh cutting pass keeps the bundle").toBe("B-9");
  expect(sizesOnly.body.gatePasses[0].pieces, "fresh cutting pass pieces").toBe(12);
  expect((await api(S.admin, "DELETE", `/api/lots/${lot.body._id}`)).status, "delete lot").toBe(200);
});

test("fabric khata: fabric in, cutting entries out, balance per fabric, day by day and the daily cutting report", async () => {
  const today = localDay();
  const yesterday = localDay(-1);
  const KEY = "e2e 15-14 kz|m";
  const balanceOf = async (session, query = "") =>
    (await api(session, "GET", `/api/fabric${query}`)).body.balances.find((b) => b.key === KEY);

  const first = await api(S.cutter, "POST", "/api/fabric/receipts", {
    day: yesterday,
    name: "E2E 15-14 KZ",
    qty: 500,
    rolls: 4,
  });
  expect(first.body.rolls, "rolls stored").toBe(4);
  expect(first.status, "receive").toBe(201);
  const cutterId = first.body.holder.id;
  expect(Boolean(cutterId), "held by the cutting master").toBe(true);
  const second = await api(S.cutter, "POST", "/api/fabric/receipts", {
    day: today,
    name: " e2e 15-14  kz ",
    qty: 200,
    note: "4 rolls",
  });
  expect(second.status, "receive again (same fabric, other spelling)").toBe(201);

  const lot = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "E2E 15-14 KZ", qty: 120 },
    sizes: [{ size: "30", qty: 40 }],
    bundleNumber: "B-50",
    note: "Double stitch on pockets",
  });
  expect(lot.status, "cutting entry").toBe(201);
  S.ids.lots.push(lot.body._id);

  const khata = await api(S.cutter, "GET", "/api/fabric");
  expect(khata.status, "khata").toBe(200);
  expect(khata.body.admin, "cutter is not admin").toBe(false);
  const row = khata.body.balances.find((b) => b.key === KEY);
  expect([row.received, row.used, row.balance], "received / used / in hand").toEqual([700, 120, 580]);
  expect(row.rolls, "rolls received").toBe(4);

  const days = await api(S.cutter, "GET", `/api/fabric?fabric=${encodeURIComponent(KEY)}`);
  expect(
    days.body.ledger[0].days.map((d) => [d.day, d.received, d.used, d.balance]),
    "day by day"
  ).toEqual([
    [yesterday, 500, 0, 500],
    [today, 200, 120, 580],
  ]);
  const period = await api(S.cutter, "GET", `/api/fabric?fabric=${encodeURIComponent(KEY)}&from=${today}&to=${today}`);
  expect(period.body.ledger[0].opening, "opening before the period").toBe(500);
  expect(
    period.body.receipts.map((r) => r.qty),
    "receipts in the period"
  ).toEqual([200]);

  const edited = await api(S.cutter, "PUT", `/api/lots/${lot.body._id}`, {
    fabric: { name: "E2E 15-14 KZ", qty: 100 },
  });
  expect(edited.status, "edit cutting entry").toBe(200);
  expect((await balanceOf(S.cutter)).balance, "edit corrects the balance").toBe(600);

  const report = await api(S.cutter, "GET", `/api/fabric/report?day=${today}`);
  expect(report.status, "report").toBe(200);
  const reportLot = report.body.lots.find((l) => l._id === lot.body._id);
  expect(reportLot.note, "remarks on the report").toBe("Double stitch on pockets");
  expect(reportLot.bundleNumber, "bundle on the report").toBe("B-50");
  const reportFabric = report.body.fabrics.find((f) => f.key === KEY);
  expect(
    [reportFabric.opening, reportFabric.received, reportFabric.used, reportFabric.closing],
    "opening / received / used / in hand"
  ).toEqual([500, 200, 100, 600]);
  expect((await api(S.cutter, "GET", "/api/fabric/report?day=26-10-2026")).status, "bad day").toBe(400);

  // the other cutting master sees none of it and can't touch it
  expect(await balanceOf(S.cutter2), "other cutter's khata").toBeUndefined();
  expect(
    (await api(S.cutter2, "PUT", `/api/fabric/receipts/${first.body._id}`, { qty: 1 })).status,
    "other cutter edit"
  ).toBe(403);
  expect((await api(S.cutter2, "DELETE", `/api/fabric/receipts/${first.body._id}`)).status, "other cutter delete").toBe(
    403
  );

  // admin sees everyone, filters by cutting master and records fabric for them
  const adminView = await api(S.admin, "GET", `/api/fabric?holderId=${cutterId}`);
  expect(adminView.body.admin, "admin flag").toBe(true);
  expect(
    adminView.body.holders.some((h) => h.id === cutterId),
    "cutting masters listed"
  ).toBe(true);
  expect(adminView.body.balances.find((b) => b.key === KEY).balance, "admin view of the cutter").toBe(600);
  const forCutter = await api(S.admin, "POST", "/api/fabric/receipts", {
    day: today,
    name: "E2E 15-14 KZ",
    qty: 50,
    holderId: cutterId,
  });
  expect(forCutter.body.holder.id, "recorded for the cutting master").toBe(cutterId);
  expect((await balanceOf(S.cutter)).balance, "cutter sees what admin gave").toBe(650);

  // correcting and deleting receipts
  expect((await api(S.cutter, "PUT", `/api/fabric/receipts/${second.body._id}`, { qty: 150 })).status, "edit").toBe(
    200
  );
  expect((await balanceOf(S.cutter)).balance, "after correcting a receipt").toBe(600);
  expect((await api(S.cutter, "DELETE", `/api/fabric/receipts/${forCutter.body._id}`)).status, "delete").toBe(200);
  expect((await balanceOf(S.cutter)).balance, "after deleting a receipt").toBe(550);

  expect((await api(S.cutter, "POST", "/api/fabric/receipts", { day: today, name: "x", qty: 0 })).status, "qty 0").toBe(
    400
  );
  expect(
    (await api(S.cutter, "POST", "/api/fabric/receipts", { day: "today", name: "x", qty: 5 })).status,
    "bad day"
  ).toBe(400);
});

uiTest(
  "UI: cutting master receives fabric, sees what is left while cutting, and the report shows the remarks",
  async (page) => {
    await browserLogin(page, "e2e-cutter", "cutter123");
    await page.goto(`${BASE}/fabric`);
    await page.waitForSelector('[data-testid="fabric-page"]', { timeout: 60_000 });
    await page.click('[data-testid="fabric-receive"]');
    await page.waitForSelector('[data-testid="fabric-receipt-form"]');
    await page.fill('[data-testid="fabric-receipt-name"]', "UI Fabric 77");
    await page.fill('[data-testid="fabric-receipt-qty"]', "300");
    await page.click('[data-testid="fabric-receipt-submit"]');
    await page.waitForSelector('[data-testid="fabric-receipt-form"]', { state: "detached", timeout: 60_000 });
    const card = page.locator('[data-testid="fabric-balance-card"][data-key="ui fabric 77|m"]');
    await card.waitFor({ timeout: 60_000 });
    expect(await card.getAttribute("data-balance"), "in hand after receiving").toBe("300");

    // cutting form: pick the fabric from our own suggestion list; what is left after this cutting shows live
    await page.goto(`${BASE}/cutting/new`);
    const form = page.locator('[data-testid="lot-form"]');
    await form.waitFor({ timeout: 60_000 });
    await page.click('[data-testid="lot-form-product"]');
    await page.getByText("E2E Slim Fit Denim", { exact: true }).first().click();
    await page.fill('[data-testid="lot-form-fabric-name"]', "ui fabric");
    await page.locator('[data-testid="lot-form-fabric-name-option"]', { hasText: "UI Fabric 77" }).click();
    expect(await page.inputValue('[data-testid="lot-form-fabric-name"]'), "picked fabric").toBe("UI Fabric 77");
    await page.fill('[data-testid="lot-form-fabric-qty"]', "120");
    const hint = page.locator('[data-testid="lot-form-fabric-balance"][data-after]');
    await hint.waitFor();
    expect(await hint.getAttribute("data-after"), "left after this cutting").toBe("180");
    await form.locator('[data-testid="lot-form-size-row"] input[type="number"]').first().fill("30");
    await page.fill('[data-testid="lot-form-note"]', "Use blue thread");
    await page.click('[data-testid="lot-form-submit"]');
    await page.waitForURL((url) => /^\/cutting\/[a-f0-9]{24}$/.test(url.pathname), { timeout: 60_000 });
    S.ids.lots.push(new URL(page.url()).pathname.split("/").pop());

    // My Lots shows the fabric in hand up front
    await page.goto(`${BASE}/cutting`);
    const strip = page.locator('[data-testid="fabric-strip-row"]', { hasText: "UI Fabric 77" });
    await strip.waitFor({ timeout: 60_000 });
    expect(await strip.innerText(), "in hand on My Lots").toContain("180 m");

    // daily cutting report: today's entry with its remarks, and the fabric left
    await page.goto(`${BASE}/fabric/report`);
    await page.waitForSelector('[data-testid="report-lot-row"]', { timeout: 60_000 });
    expect(
      await page.locator('[data-testid="report-lot-row"]', { hasText: "Use blue thread" }).count(),
      "remarks shown"
    ).toBe(1);
    expect(
      await page.locator('[data-testid="report-fabric-row"][data-key="ui fabric 77|m"]').getAttribute("data-closing"),
      "in hand at the end of the day"
    ).toBe("180");
    await page.click('[data-testid="report-prev-day"]');
    await page.waitForSelector('[data-testid="report-no-lots"]', { timeout: 60_000 });
    expect(await page.getAttribute('[data-testid="report-day"]', "data-value"), "moved a day back").toBe(localDay(-1));
  }
);

test("Dispatch: ready pieces leave in parts with a dispatch gate pass, out of the Ready stock, with the labour cost", async () => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim", qty: 30 },
    sizes: [
      { size: "30", qty: 20 },
      { size: "32", qty: 20 },
    ],
    bundleNumber: "C-77",
    note: "dispatch",
  });
  const id = created.body._id;
  S.ids.lots.push(id);
  S.dispatchLotId = id;
  for (const step of [{ action: "send_stitching" }, { action: "stitched", qty: 40 }, { action: "washed", qty: 40 }]) {
    expect((await api(S.admin, "POST", `/api/lots/${id}/stage`, step)).status, step.action).toBe(200);
  }
  // labour on the lot: 40 pcs × Rs 4 = 160 → Rs 4 a finished piece
  const operation = (await api(S.admin, "GET", "/api/operations")).body.operations.find((o) => o.name === "E2E Pocket");
  const worker = (await api(S.admin, "GET", "/api/workers")).body.find((w) => w.name === "E2E Akram");
  const work = await api(S.admin, "POST", "/api/work-entries", {
    lotId: id,
    operationId: operation._id,
    rate: 4,
    rows: [{ workerId: worker._id, pieces: 40 }],
  });
  expect(work.status, "labour").toBe(201);

  const notReady = await api(S.admin, "POST", `/api/lots/${id}/dispatch-out`, {
    party: "E2E Shop",
    sizes: [{ size: "30", qty: 1 }],
  });
  expect(notReady.status, "only a Ready lot").toBe(409);
  const ready = await api(S.admin, "POST", `/api/lots/${id}/stage`, {
    action: "ready",
    qty: 40,
    sizes: [
      { size: "30", qty: 20 },
      { size: "32", qty: 20 },
    ],
  });
  expect(ready.status, "ready").toBe(200);
  const stockOf = async () =>
    (await api(S.admin, "GET", "/api/products")).body
      .find((p) => p._id === S.productId)
      .sizes.find((z) => z.size === "30").remaining;
  const before = await stockOf();

  const first = await api(S.admin, "POST", `/api/lots/${id}/dispatch-out`, {
    party: " E2E Shop ",
    sizes: [
      { size: "30", qty: 10 },
      { size: "32", qty: 0 },
    ],
    note: "2 cartons",
  });
  expect(first.status, "dispatch 10").toBe(201);
  const pass = first.body.pass;
  expect([pass.type, pass.party, pass.pieces, pass.partial], "dispatch gate pass").toEqual([
    "dispatch",
    "E2E Shop",
    10,
    true,
  ]);
  expect(/^GP-\d{4,}$/.test(pass.number), "numbered").toBe(true);
  expect(pass.sizes, "sizes going out").toEqual([{ size: "30", qty: 10 }]);
  expect([pass.cost.perPiece, pass.cost.amount], "labour cost").toEqual([4, 40]);
  expect(pass.bundleNumber, "cut number on the pass").toBe("C-77");
  expect(await stockOf(), "ready stock went down").toBe(before - 10);

  const tooMany = await api(S.admin, "POST", `/api/lots/${id}/dispatch-out`, {
    party: "E2E Shop",
    sizes: [{ size: "30", qty: 11 }],
  });
  expect(tooMany.status, "more than is left").toBe(409);
  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/dispatch-out`, { party: "", sizes: [{ size: "30", qty: 1 }] })).status,
    "party needed"
  ).toBe(400);
  expect(
    (await api(S.cutter, "POST", `/api/lots/${id}/dispatch-out`, { party: "X", sizes: [{ size: "30", qty: 1 }] }))
      .status,
    "cutting master can't dispatch"
  ).toBe(403);

  const second = await api(S.admin, "POST", `/api/lots/${id}/dispatch-out`, {
    party: "E2E Market",
    sizes: [{ size: "32", qty: 15 }],
  });
  expect(second.status, "a second part").toBe(201);
  expect(second.body.dispatchQty, "dispatched so far").toBe(25);
  const lot = (await api(S.admin, "GET", `/api/lots/${id}`)).body;
  expect(lot.dispatchSizes, "per size").toEqual([
    { size: "30", qty: 10 },
    { size: "32", qty: 15 },
  ]);
  expect(lot.events.map((e) => e.type).filter((t) => t === "dispatched_out").length, "events").toBe(2);
  expect(
    (await api(S.admin, "POST", `/api/lots/${id}/reverse`, { reason: "oops" })).status,
    "no reverse once pieces left"
  ).toBe(409);
  const parties = await api(S.admin, "GET", "/api/gate-passes/parties");
  expect(parties.body.includes("E2E Shop") && parties.body.includes("E2E Market"), "parties remembered").toBe(true);
  expect(
    (await api(S.cutter, "GET", `/api/lots/${id}/gate-passes`)).body.map((p) => p.type).join(","),
    "cutting master: still only the cutting pass"
  ).toBe("cutting");

  // the labour stays booked on the lot; remove it so the cleanup can delete the worker
  for (const entry of work.body) await api(S.admin, "DELETE", `/api/work-entries/${entry._id}`);
});

test("deleting a lot at cutting also removes its cutting gate pass", async () => {
  const lot = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim" },
    sizes: [{ size: "30", qty: 5 }],
  });
  expect(lot.body.gatePasses.length, "pass issued").toBe(1);
  expect((await api(S.admin, "DELETE", `/api/lots/${lot.body._id}`)).status, "delete").toBe(200);
  const dash = await api(S.admin, "GET", "/api/dashboard");
  expect(
    dash.body.gatePasses.some((p) => String(p.lotId) === lot.body._id),
    "deleted lot's pass gone"
  ).toBe(false);
});

uiTest("UI: admin sees the dashboard, the lots list and the users page", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.waitForSelector('[data-testid="dash-pipeline"]', { timeout: 60_000 });
  for (const card of ["dash-hero", "dash-trend", "dash-waiting", "dash-activity", "dash-stock", "dash-spending"]) {
    expect(await page.locator(`[data-testid="${card}"]`).count(), card).toBe(1);
  }
  expect(await page.locator('[data-testid="dash-workers"]').count(), "workers card").toBe(1);
  expect(await page.locator('[data-testid="dash-gatepasses"]').count(), "gate passes card").toBe(1);
  expect((await page.getByText("Invoice Report", { exact: true }).count()) > 0, "menu says Invoice Report").toBe(true);
  expect(await page.getByText("Lot Report", { exact: true }).count(), "menu has no Lot Report").toBe(0);
  const washingLots = Number(await page.getAttribute('[data-testid="dash-stage-washing-lots"]', "data-value"));
  expect(washingLots >= 1, "a lot at washing").toBe(true);
  await page.click('[data-testid="dash-view-table"]');
  await page.waitForSelector('[data-testid="dash-trend-table"] tbody tr', { timeout: 60_000 });
  expect(await page.locator('[data-testid="dash-trend-table"] tbody tr').count(), "14 days in the table").toBe(14);
  // A pipeline stage opens the lots list filtered to that stage.
  await page.click('[data-testid="dash-stage-washing"]');
  await page.waitForURL((url) => url.pathname === "/lots" && url.searchParams.get("stage") === "washing", {
    timeout: 60_000,
  });
  await page.waitForSelector('[data-testid="lots-filter-washing"][aria-pressed="true"]', { timeout: 60_000 });
  await page.goto(`${BASE}/lots`);
  await page.waitForSelector('[data-testid="lots-row"]', { timeout: 60_000 });
  expect((await page.locator('[data-testid="lots-row"]').count()) >= 3, "lots listed").toBe(true);
  // Rows that come back after a search/filter must animate in again (they used to stay at opacity 0).
  await page.fill('[data-testid="lots-search"]', "no-such-lot");
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="lots-row"]').length === 0, null, {
    timeout: 60_000,
  });
  await page.fill('[data-testid="lots-search"]', "");
  await page.waitForSelector('[data-testid="lots-row"]', { timeout: 60_000 });
  await page.waitForTimeout(2000);
  const hiddenRows = await page.$$eval(
    '[data-testid="lots-row"]',
    (rows) => rows.filter((row) => getComputedStyle(row.parentElement).opacity !== "1").length
  );
  expect(hiddenRows, "rows visible after clearing the search").toBe(0);
  // Hidden shop modules (src/constants/modules.js): no sidebar link, and the page sends the admin back home.
  expect(await page.locator('[data-testid="nav-sales"]').count(), "sales hidden from the sidebar").toBe(0);
  expect(await page.locator('[data-testid="nav-recovery"]').count(), "recovery hidden from the sidebar").toBe(0);
  await page.goto(`${BASE}/customers`);
  await page.waitForURL((url) => url.pathname === "/", { timeout: 60_000 });
  await page.goto(`${BASE}/users`);
  await page.waitForSelector('[data-testid="user-row"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="user-row"][data-user-name="e2e-cutter"]').count(), "cutter listed").toBe(1);
});

uiTest("UI: admin adds a cutting master from the Users form", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/users`);
  await page.click('[data-testid="users-add"]');
  const form = page.locator('[data-testid="user-form"]');
  await form.waitFor({ timeout: 60_000 });
  await form.locator('input[name="name"]').fill("e2e-ui-cutter");
  await form.locator('input[name="password"]').fill("cutter123");
  await form.locator('input[name="confirmPassword"]').fill("cutter123");
  await page.click('[data-testid="user-form-role"] button');
  // Scope to the dropdown: the users table also shows "Cutting Master" role badges.
  await page.locator('[data-testid="user-form-role"] li', { hasText: "Cutting Master" }).click();
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/users") && r.request().method() === "POST", { timeout: 60_000 }),
    page.click('[data-testid="user-form-submit"]'),
  ]);
  expect(response.status(), "create user status").toBe(201);
  const created = await response.json();
  S.ids.users.push(created._id);
  await page.waitForSelector('[data-testid="user-row"][data-user-name="e2e-ui-cutter"]', { timeout: 60_000 });
});

uiTest("UI (Phase 2): admin moves a lot through the stage panel and sees shortfall + report", async (page) => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 5 },
    sizes: [
      { size: "30", qty: 50 },
      { size: "32", qty: 50 },
    ],
    note: "phase2-ui",
  });
  expect(created.status, "create lot").toBe(201);
  const id = created.body._id;
  S.ids.lots.push(id);

  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/lots/${id}`);
  const panel = page.locator('[data-testid="lot-stage-panel"]');
  await panel.waitFor({ timeout: 60_000 });

  // cutting → stitching
  await page.click('[data-testid="lot-stage-action"]');
  await page.waitForSelector('[data-testid="lot-stage-panel"][data-action="stitched"]', { timeout: 60_000 });

  // stitching → washing with 98 pieces (2 short)
  await page.fill('[data-testid="lot-stage-qty"]', "98");
  await page.click('[data-testid="lot-stage-action"]');
  await page.waitForSelector('[data-testid="lot-stage-panel"][data-action="washed"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="lot-pipeline-qty-stitching"]').innerText(), "pipeline stitched").toContain(
    "98"
  );

  // washing → packing with 97 pieces
  await page.fill('[data-testid="lot-stage-qty"]', "97");
  await page.click('[data-testid="lot-stage-action"]');
  await page.waitForSelector('[data-testid="lot-stage-panel"][data-action="ready"]', { timeout: 60_000 });
  S.uiLotId = id;
  expect(
    await page.locator('[data-testid="lot-shortfall"]').getAttribute("data-shortfall-total"),
    "shortfall total"
  ).toBe("3");
  expect(await page.locator('[data-testid="lot-history-item"]').count(), "history entries").toBe(4);

  // report page lists it with the shortfall
  await page.goto(`${BASE}/lots/report`);
  await page.waitForSelector('[data-testid="lot-report-row"]', { timeout: 60_000 });
  const row = page.locator(`[data-testid="lot-report-row"][data-lot-number="${created.body.lotNumber}"]`);
  expect(await row.count(), "report row").toBe(1);
  expect(await row.getAttribute("data-shortfall"), "report shortfall").toBe("3");
  expect(await page.locator('[data-testid="lot-report-download"]').count(), "download button").toBe(1);
});

uiTest(
  "UI (Phase 3): admin marks the lot Ready from the form, stock chip + history appear, then reverses",
  async (page) => {
    const id = S.uiLotId; // packing: cut 100, stitched 98, washed 97
    const before = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);

    await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
    await page.goto(`${BASE}/lots/${id}`);
    await page.waitForSelector('[data-testid="lot-stage-panel"][data-action="ready"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="lot-ready-qty"]').inputValue(), "default pieces").toBe("97");
    expect(await page.locator('[data-testid="lot-ready-total"]').getAttribute("data-total"), "auto split total").toBe(
      "97"
    );
    await page.click('[data-testid="lot-stage-action"]');
    await page.click('[data-testid="lot-ready-confirm"]');
    await page.waitForSelector('[data-testid="lot-ready-done"]', { timeout: 60_000 });

    const after = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
    expect(after.remaining - before.remaining, "stock added from UI").toBe(97);

    await page.goto(`${BASE}/inventory`);
    const row = page.locator('[data-testid="product-row"][data-product-name="E2E Slim Fit Denim"]');
    await row.waitFor({ timeout: 60_000 });
    expect(await row.locator('[data-testid="product-last-lot"]').count(), "last lot chip").toBe(1);
    await row.locator('[data-testid="product-stock-history"]').click();
    await page.waitForSelector('[data-testid="stock-history-row"]', { timeout: 60_000 });
    expect((await page.locator('[data-testid="stock-history-row"]').count()) >= 1, "history rows").toBe(true);

    await page.goto(`${BASE}/lots/${id}`);
    await page.click('[data-testid="lot-reverse"]');
    await page.fill('[data-testid="lot-reverse-reason"]', "e2e reverse");
    await page.click('[data-testid="lot-reverse-confirm"]');
    await page.waitForSelector('[data-testid="lot-stage-panel"][data-action="ready"]', { timeout: 60_000 });
    const restored = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
    expect(restored.remaining, "stock restored from UI").toBe(before.remaining);
  }
);

uiTest(
  "UI (Phase 4): admin records the lot shortfall as B-pair from the shortcut, edits it and sees the history",
  async (page) => {
    const id = S.uiLotId; // back at packing after the Phase 3 reverse; shortfall 3
    await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
    await page.goto(`${BASE}/lots/${id}`);
    await page.waitForSelector('[data-testid="lot-shortfall-ledger"]', { timeout: 60_000 });
    await page.click('[data-testid="lot-shortfall-ledger"]');
    await page.waitForSelector('[data-testid="ledger-form"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="ledger-form-qty"]').inputValue(), "prefilled qty").toBe("3");
    await page.fill('[data-testid="ledger-form-note"]', "e2e shortfall");
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/ledger") && r.request().method() === "POST", {
        timeout: 60_000,
      }),
      page.click('[data-testid="ledger-form-submit"]'),
    ]);
    expect(response.status(), "create status").toBe(201);
    const created = await response.json();
    S.ids.ledger.push(created._id);
    const row = page.locator(`[data-testid="ledger-row"][data-entry-id="${created._id}"]`);
    await row.waitFor({ timeout: 60_000 });
    expect(await row.getAttribute("data-type"), "type").toBe("bpair");
    expect(await row.getAttribute("data-lot-number"), "lot link").toBeTruthy();

    await row.locator('[data-testid="ledger-row-edit"]').click();
    await page.waitForSelector('[data-testid="ledger-form"]', { timeout: 60_000 });
    await page.fill('[data-testid="ledger-form-qty"]', "2");
    await page.click('[data-testid="ledger-form-submit"]');
    await page.waitForFunction(() => !document.querySelector('[data-testid="ledger-form"]'), null, {
      timeout: 60_000,
    });
    await page.waitForFunction(
      (entryId) =>
        document
          .querySelector(`[data-testid="ledger-row"][data-entry-id="${entryId}"] [data-testid="ledger-row-qty"]`)
          ?.textContent?.startsWith("2"),
      created._id,
      { timeout: 60_000 }
    );
    await row.locator('[data-testid="ledger-row-history"]').click();
    await page.waitForSelector('[data-testid="ledger-history-item"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="ledger-history-item"]').count(), "one edit in history").toBe(1);
    await page.click('button[aria-label="Close"]');

    await page.click('[data-testid="ledger-filter-fabric"]');
    await page.waitForSelector('[data-testid="ledger-empty"]', { timeout: 60_000 });
  }
);

uiTest("UI (Phase 5): admin enables sizes on an existing product from the edit popup", async (page) => {
  const hoodie = await api(S.admin, "POST", "/api/products", {
    name: "E2E Plain Hoodie",
    category: "Hoodies",
    purchasePrice: 900,
    salePrice: 1500,
    remaining: 30,
  });
  S.ids.products.push(hoodie.body._id);

  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/inventory`);
  const row = page.locator('[data-testid="product-row"][data-product-name="E2E Plain Hoodie"]');
  await row.waitFor({ timeout: 60_000 });
  await row.locator('[data-testid="product-edit"]').click();
  const form = page.locator('[data-testid="product-edit-form"]');
  await form.waitFor({ timeout: 60_000 });
  await form.locator('[data-testid="product-track-sizes"]').click();
  expect(
    await form.locator('[data-testid="product-track-sizes"]').getAttribute("aria-checked"),
    "size tracking switched on"
  ).toBe("true");
  const qtyInputs = form.locator('[data-testid="product-size-row"] input[type="number"]');
  await qtyInputs.nth(0).fill("10");
  await qtyInputs.nth(1).fill("20");
  expect(await form.locator('[data-testid="product-size-hint"]').getAttribute("data-diff"), "split matches").toBe("0");
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`/api/products/${hoodie.body._id}`) && r.request().method() === "PUT",
      {
        timeout: 60_000,
      }
    ),
    page.click('[data-testid="product-form-submit"]'),
  ]);
  expect(response.status(), "update status").toBe(200);
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-testid="product-row"][data-product-name="E2E Plain Hoodie"]')
        ?.innerText.includes("30 · 10"),
    null,
    { timeout: 60_000 }
  );
  const product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === hoodie.body._id);
  expect(product.remaining, "total after enabling sizes").toBe(30);
  expect(product.sizes.map((s) => `${s.size}:${s.remaining}`).join(","), "sizes").toBe("30:10,32:20,34:0,36:0");
});

uiTest(
  "UI (Phase 6): admin assigns an operation to two workers from the lot page and sees it in Wages",
  async (page) => {
    const id = S.uiLotId; // cut 100, stitched 98 → 98 pcs of work
    await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
    await page.goto(`${BASE}/lots/${id}`);
    await page.waitForSelector('[data-testid="lot-work-panel"]', { timeout: 60_000 });
    await page.click('[data-testid="lot-assign-work"]');
    await page.waitForSelector('[data-testid="assign-work-form"]', { timeout: 60_000 });
    await page.locator('[data-testid="assign-operation"] button').click();
    await page.locator('[data-testid="assign-operation"] li', { hasText: "E2E Pocket" }).click();
    expect(await page.locator('[data-testid="assign-rate"]').inputValue(), "rate prefilled").toBe("4");
    await page.click('[data-testid="assign-add-worker"]');
    const rows = page.locator('[data-testid="assign-row"]');
    await rows.nth(0).locator("button").first().click();
    await rows.nth(0).locator("li", { hasText: "E2E Akram" }).click();
    await rows.nth(1).locator("button").first().click();
    await rows.nth(1).locator("li", { hasText: "E2E Bilal" }).click();
    expect(await page.locator('[data-testid="assign-total"]').getAttribute("data-amount"), "98 x 4").toBe("392");
    await page.click('[data-testid="assign-submit"]');
    await page.waitForSelector('[data-testid="lot-work-group"][data-operation="E2E Pocket"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="lot-work-entry"]').count(), "two entries").toBe(2);
    expect(await page.locator('[data-testid="lot-work-amount"]').getAttribute("data-amount"), "lot labour").toBe("392");

    await page.goto(`${BASE}/wages`);
    await page.waitForSelector('[data-testid="wages-row"]', { timeout: 60_000 });
    expect(
      await page.locator('[data-testid="wages-row"][data-worker="E2E Akram"]').getAttribute("data-net"),
      "akram net"
    ).toBe("196");
    expect(await page.locator('[data-testid="wages-total"]').getAttribute("data-net"), "total").toBe("392");

    // one day of leave for Bilal on the Attendance page: cut at his per-day salary (100)
    await page.goto(`${BASE}/attendance`);
    const bilalRow = page.locator('[data-testid="attendance-row"][data-worker="E2E Bilal"]');
    await bilalRow.waitFor({ timeout: 60_000 });
    const saved = page.waitForResponse((r) => r.url().includes("/api/attendance") && r.request().method() === "PUT");
    await bilalRow.locator('[data-testid="attendance-leave"]').click();
    expect((await saved).status(), "attendance saved").toBe(200);
    expect(await bilalRow.getAttribute("data-status"), "marked leave").toBe("leave");
    expect(await bilalRow.locator('[data-testid="attendance-row-cut"]').innerText(), "one day cut").toContain("100");
    await page.click('[data-testid="attendance-tab-month"]');
    const registerRow = page.locator('[data-testid="attendance-month-row"][data-worker="E2E Bilal"]');
    await registerRow.waitFor({ timeout: 60_000 });
    expect(
      await registerRow.locator(`td[data-day="${localDay()}"]`).getAttribute("data-status"),
      "register shows the leave"
    ).toBe("leave");
    await page.goto(`${BASE}/wages`);
    await page.waitForSelector('[data-testid="wages-row"]', { timeout: 60_000 });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="wages-row"][data-worker="E2E Bilal"]')?.dataset.net === "96",
      null,
      { timeout: 60_000 }
    );

    // Advance account: Rs 100 advance for Akram is not cut from his wages until an "Advance cut" is recorded.
    await page.click('[data-testid="wages-add-adjustment"]');
    await page.waitForSelector('[data-testid="adjustment-form"]', { timeout: 60_000 });
    await page.click('[data-testid="adjustment-type-advance"]');
    await page.locator('[data-testid="adjustment-worker"] button').click();
    await page.locator('[data-testid="adjustment-worker"] li', { hasText: "E2E Akram" }).click();
    await page.fill('[data-testid="adjustment-amount"]', "100");
    await page.click('[data-testid="adjustment-submit"]');
    const account = page.locator('[data-testid="advance-account"][data-worker="E2E Akram"]');
    await account.waitFor({ timeout: 60_000 });
    expect(await account.getAttribute("data-balance"), "advance left").toBe("100");
    expect(
      await page.locator('[data-testid="wages-row"][data-worker="E2E Akram"]').getAttribute("data-net"),
      "advance alone does not cut the wages"
    ).toBe("196");

    // "Cut" opens the popup preset to an advance cut for Akram; more than what is left is refused.
    await account.locator('[data-testid="advance-cut"]').click();
    await page.waitForSelector('[data-testid="adjustment-form"]', { timeout: 60_000 });
    expect(
      await page.locator('[data-testid="adjustment-type-recovery"]').getAttribute("aria-pressed"),
      "advance cut preset"
    ).toBe("true");
    expect(await page.locator('[data-testid="adjustment-balance"]').getAttribute("data-balance"), "balance").toBe(
      "100"
    );
    await page.fill('[data-testid="adjustment-amount"]', "150");
    await page.waitForSelector('[data-testid="adjustment-problem"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="adjustment-submit"]').isDisabled(), "too much").toBe(true);
    await page.click('[data-testid="adjustment-cut-all"]');
    expect(await page.locator('[data-testid="adjustment-amount"]').inputValue(), "cut all").toBe("100");
    await page.click('[data-testid="adjustment-submit"]');
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="advance-account"][data-worker="E2E Akram"]')?.dataset.balance === "0" &&
        document.querySelector('[data-testid="wages-row"][data-worker="E2E Akram"]')?.dataset.net === "96",
      null,
      { timeout: 60_000 }
    );

    // Advance cuts first: an advance that was (partly) cut can only be deleted after its cuts.
    const adjustments = (await api(S.admin, "GET", "/api/wage-adjustments?filter=all")).body.sort(
      (a, b) => (b.type === "recovery") - (a.type === "recovery")
    );
    for (const adj of adjustments) await api(S.admin, "DELETE", `/api/wage-adjustments/${adj._id}`);

    // clean the UI entries so the cleanup can delete the workers/operations
    const entries = (await api(S.admin, "GET", `/api/work-entries?lotId=${id}`)).body;
    for (const entry of entries) await api(S.admin, "DELETE", `/api/work-entries/${entry._id}`);
    const bilal = (await api(S.admin, "GET", "/api/workers")).body.find((w) => w.name === "E2E Bilal");
    await api(S.admin, "PUT", "/api/attendance", { day: localDay(), marks: [{ workerId: bilal._id, status: "" }] });
  }
);

uiTest(
  "UI: an operation goes under its main operation; a category rate card decides what the lot offers",
  async (page) => {
    await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
    await page.goto(`${BASE}/workers`);
    await page.waitForSelector('[data-testid="workers-page"]', { timeout: 60_000 });

    // new operation under Washing
    await page.click('[data-testid="workers-tab-operations"]');
    await page.click('[data-testid="operations-add"]');
    await page.waitForSelector('[data-testid="operation-form"]');
    await page.fill('[data-testid="operation-form-name"]', "E2E UI Wash");
    await page.fill('[data-testid="operation-form-rate"]', "6");
    await page.click('[data-testid="operation-form-stage-washing"]');
    await page.click('[data-testid="operation-form-submit"]');
    await page.waitForSelector(
      '[data-testid="operation-group"][data-stage="washing"] [data-testid="operation-row"][data-operation-name="E2E UI Wash"]',
      { timeout: 60_000 }
    );
    const uiWash = (await api(S.admin, "GET", "/api/operations")).body.operations.find((o) => o.name === "E2E UI Wash");
    S.ids.operations.push(uiWash._id);

    // the article's category gets a card: E2E Pocket at Rs 5
    const product = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
    await page.click('[data-testid="workers-tab-cards"]');
    const card = page.locator(`[data-testid="rate-card"][data-category="${product.category}"]`);
    await card.waitFor({ timeout: 60_000 });
    await card.locator('[data-testid="rate-card-edit"]').click();
    await page.waitForSelector('[data-testid="rate-card-form"]');
    const pocket = page.locator('[data-testid="rate-card-row"][data-operation="E2E Pocket"]');
    await pocket.locator('[data-testid="rate-card-check"]').click();
    await pocket.locator('[data-testid="rate-card-rate"]').fill("5");
    expect(await page.getAttribute('[data-testid="rate-card-total"]', "data-total"), "total per piece").toBe("5");
    await page.click('[data-testid="rate-card-submit"]');
    await page.waitForSelector('[data-testid="rate-card-form"]', { state: "detached", timeout: 60_000 });
    await page.waitForFunction(
      (name) => document.querySelector(`[data-testid="rate-card"][data-category="${name}"]`)?.dataset.total === "5",
      product.category,
      { timeout: 60_000 }
    );

    // the lot only offers the card's operation, at the card's rate, and shows its progress
    await page.goto(`${BASE}/lots/${S.uiLotId}`);
    await page.waitForSelector('[data-testid="lot-work-op"][data-operation="E2E Pocket"]', { timeout: 60_000 });
    await page.click('[data-testid="lot-assign-work"]');
    await page.waitForSelector('[data-testid="assign-rate-card"][data-from-card="true"]', { timeout: 60_000 });
    await page.locator('[data-testid="assign-operation"] button').click();
    expect(await page.locator('[data-testid="assign-operation"] li').count(), "only the card's operation").toBe(1);
    await page.locator('[data-testid="assign-operation"] li', { hasText: "E2E Pocket" }).click();
    expect(await page.locator('[data-testid="assign-rate"]').inputValue(), "card rate prefilled").toBe("5");

    await api(S.admin, "PUT", `/api/operation-sets/${encodeURIComponent(product.category)}`, { items: [] });
  }
);

uiTest("UI (Phase 7): the lot page lists gate passes and the preview shows both phone numbers", async (page) => {
  const lot = (await api(S.admin, "GET", "/api/lots")).body.find((l) => l.note === "phase7");
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/lots/${lot._id}`);
  await page.waitForSelector('[data-testid="gate-pass-row"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-row"]').count(), "four passes").toBe(4);
  expect(
    await page.locator('[data-testid="gate-pass-row"]').evaluateAll((rows) => rows.map((r) => r.dataset.type).join()),
    "cutting, stitching, washing, reissued washing"
  ).toBe("cutting,stitching,washing,washing");
  await page.locator('[data-testid="gate-pass-row"][data-type="cutting"] [data-testid="gate-pass-open"]').click();
  await page.waitForSelector('[data-testid="gate-pass-document"][data-type="cutting"]', { timeout: 60_000 });
  expect((await page.locator('[data-testid="gate-pass-title"]').innerText()).toLowerCase(), "cutting title").toBe(
    "cutting gate pass"
  );
  expect(await page.locator('[data-testid="gate-pass-bundle"]').innerText(), "bundle on cutting pass").toBe("B-7");
  await page.click('button[aria-label="Close"]');
  await page.waitForSelector('[data-testid="gate-pass-document"]', { state: "detached", timeout: 60_000 });
  expect(await page.locator('[data-testid="lot-cutting-details"]').innerText(), "bundle shown").toContain("B-7");
  await page.locator('[data-testid="gate-pass-row"][data-type="stitching"] [data-testid="gate-pass-open"]').click();
  await page.waitForSelector('[data-testid="gate-pass-document"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-phone-top"]').innerText(), "top phone").toBe("0321-4361127");
  expect(await page.locator('[data-testid="gate-pass-phone-bottom"]').innerText(), "bottom phone").toBe("0323-8888000");
  expect(await page.locator('[data-testid="gate-pass-lot"]').innerText(), "lot number").toBe(lot.lotNumber);
  expect(lot.lotNumber.startsWith("INV-"), "number reads INV-").toBe(true);
  const passText = await page.locator('[data-testid="gate-pass-document"]').textContent();
  expect(passText, "invoice label on the pass").toContain("Invoice no.");
  expect(/\bLot\b/.test(passText), "no Lot label on the pass").toBe(false);
  expect(await page.locator('[data-testid="gate-pass-shrinkage"]').innerText(), "shrinkage").toBe("2 inch");
  expect(await page.locator('[data-testid="gate-pass-sizes"]').innerText(), "sizes").toBe("30 – 32");
  await page.click('button[aria-label="Close"]');

  // cutting master sees the passes read-only (print only, no issue buttons)
  await page.context().clearCookies();
  await browserLogin(page, "e2e-cutter", "cutter123");
  await page.goto(`${BASE}/cutting/${lot._id}`);
  await page.waitForSelector('[data-testid="gate-pass-row"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid^="gate-pass-issue-"]').count(), "no issue buttons for cutter").toBe(0);
});

uiTest(
  "UI: the cutting master sees cutting only; admin dispatches the rest of a lot and sees raw material",
  async (page) => {
    // cutting master: no stages anywhere, only the cutting gate pass
    await browserLogin(page, "e2e-cutter", "cutter123");
    await page.goto(`${BASE}/cutting`);
    await page.waitForSelector('[data-testid="lot-card"]', { timeout: 60_000 });
    expect(await page.getByText("In process", { exact: true }).count(), "no stage cards").toBe(0);
    expect((await page.getByRole("heading", { name: "My Invoices" }).count()) > 0, "page says My Invoices").toBe(true);
    expect(await page.getByText("My Lots").count(), "no My Lots left").toBe(0);
    const phase7 = (await api(S.admin, "GET", "/api/lots")).body.find((l) => l.note === "phase7");
    await page.goto(`${BASE}/cutting/${phase7._id}`);
    await page.waitForSelector('[data-testid="lot-detail"]', { timeout: 60_000 });
    await page.waitForSelector('[data-testid="gate-pass-row"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid^="lot-pipeline-qty-"]').count(), "no pipeline").toBe(0);
    expect(
      await page.locator('[data-testid="gate-pass-row"]').evaluateAll((rows) => rows.map((r) => r.dataset.type).join()),
      "cutting gate pass only"
    ).toBe("cutting");
    expect(await page.locator('[data-testid="lot-detail-locked"]').count(), "locked, without saying where it is").toBe(
      1
    );
    expect(await page.locator('[data-testid="lot-cutting-details"]').innerText(), "cut number label").toContain(
      "CUT NO."
    );

    // admin: dispatch what is left of the dispatch lot (15 of size 30); its labour is 40 pcs × Rs 4 again
    const operation = (await api(S.admin, "GET", "/api/operations")).body.operations.find(
      (o) => o.name === "E2E Pocket"
    );
    const worker = (await api(S.admin, "GET", "/api/workers")).body.find((w) => w.name === "E2E Akram");
    const work = await api(S.admin, "POST", "/api/work-entries", {
      lotId: S.dispatchLotId,
      operationId: operation._id,
      rate: 4,
      rows: [{ workerId: worker._id, pieces: 40 }],
    });
    await page.context().clearCookies();
    await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
    await page.goto(`${BASE}/lots/${S.dispatchLotId}`);
    const panel = page.locator('[data-testid="dispatch-panel"]');
    await panel.waitFor({ timeout: 60_000 });
    expect(await panel.getAttribute("data-left"), "left in the factory").toBe("15");
    await page.click('[data-testid="dispatch-open"]');
    await page.waitForSelector('[data-testid="dispatch-out-form"]');
    await page.fill('[data-testid="dispatch-party"]', "e2e");
    await page.locator('[data-testid="dispatch-party-option"]', { hasText: "E2E Shop" }).click();
    expect(await page.getAttribute('[data-testid="dispatch-total"]', "data-pieces"), "all that is left").toBe("15");
    await page.click('[data-testid="dispatch-submit"]');
    await page.waitForSelector('[data-testid="gate-pass-document"][data-type="dispatch"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="gate-pass-party"]').innerText(), "party on the pass").toBe("E2E Shop");
    expect(await page.locator('[data-testid="gate-pass-pieces"]').innerText(), "pieces on the pass").toBe("15 pcs");
    expect(await page.locator('[data-testid="gate-pass-cost"]').innerText(), "labour cost on the pass").toBe("60/-");
    await page.click('button[aria-label="Close"]');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="dispatch-panel"]')?.dataset.left === "0",
      null,
      { timeout: 60_000 }
    );
    expect(await page.locator('[data-testid="lot-reverse"]').count(), "no reverse after dispatch").toBe(0);
    for (const entry of work.body) await api(S.admin, "DELETE", `/api/work-entries/${entry._id}`);

    // Inventory → Raw material
    await page.goto(`${BASE}/inventory`);
    await page.click('[data-testid="inventory-tab-raw"]');
    await page.waitForSelector('[data-testid="raw-material"] [data-testid="fabric-balance-card"]', { timeout: 60_000 });
    expect(await page.locator('[data-testid="raw-received"]').innerText(), "received in raw").toContain("m");
  }
);

uiTest("UI (Phase 7b): the stitching page shows what is lying and sends a part out with a gate pass", async (page) => {
  const created = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim 12oz", qty: 40 },
    sizes: [{ size: "30", qty: 80 }],
    note: "phase7b-ui",
  });
  const id = created.body._id;
  S.ids.lots.push(id);
  await api(S.admin, "POST", `/api/lots/${id}/stage`, { action: "send_stitching" });

  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/stitching`);
  const row = page.locator(`[data-testid="stitching-row"][data-lot-number="${created.body.lotNumber}"]`);
  await row.waitFor({ timeout: 60_000 });
  expect(await row.getAttribute("data-lying"), "lying before").toBe("80");
  await row.locator('[data-testid="stitching-row-dispatch"]').click();
  await page.waitForSelector('[data-testid="dispatch-form"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="dispatch-pieces"]').inputValue(), "defaults to everything lying").toBe("80");
  await page.fill('[data-testid="dispatch-pieces"]', "25");
  await page.fill('[data-testid="dispatch-wash"]', "Random wash");
  await page.click('[data-testid="dispatch-submit"]');
  await page.waitForSelector('[data-testid="gate-pass-document"][data-type="washing"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-pieces"]').innerText(), "pass pieces").toBe("25 pcs");
  await page.click('button[aria-label="Close"]');
  await page.waitForFunction(
    (lotNumber) =>
      document.querySelector(`[data-testid="stitching-row"][data-lot-number="${lotNumber}"]`)?.dataset.lying === "55",
    created.body.lotNumber,
    { timeout: 60_000 }
  );

  // the lot page shows the same balance and lists the partial pass
  await page.goto(`${BASE}/lots/${id}`);
  await page.waitForSelector('[data-testid="stitching-balance"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="stitching-balance"]').getAttribute("data-lying"), "lot page lying").toBe(
    "55"
  );
  // the gate pass list loads separately from the lot itself
  await page.waitForSelector('[data-testid="gate-pass-row"][data-type="washing"]', { timeout: 60_000 });
  expect(await page.locator('[data-testid="gate-pass-row"][data-type="washing"]').count(), "partial pass listed").toBe(
    1
  );
});

uiTest("UI: purchasing ledger records a vendor payment and shows the balance", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/purchasing`);
  await page.click('[data-testid="purchasing-tab-ledger"]');
  await page.waitForSelector('[data-testid="purchase-ledger"]', { timeout: 60_000 });
  await page.locator('[data-testid="ledger-vendor"] button').click();
  await page.locator('[data-testid="ledger-vendor"] li', { hasText: "E2E Vendor" }).click();
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="purchase-ledger-row"]').length === 1,
    null,
    { timeout: 60_000 }
  );
  await page.click('[data-testid="ledger-record-payment"]');
  await page.waitForSelector('[data-testid="payment-form"]', { timeout: 60_000 });
  expect(await page.getAttribute('[data-testid="payment-payable"]', "data-payable"), "payable shown").toBe("2400");
  await page.fill('[data-testid="payment-amount"]', "400");
  // The custom date field: open the calendar, take "Yesterday", the field shows it and the calendar closes.
  await page.click('[data-testid="payment-date"]');
  await page.waitForSelector('[data-testid="payment-date-panel"]', { timeout: 60_000 });
  await page.locator('[data-testid="payment-date-panel"] button', { hasText: "Yesterday" }).click();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA");
  await page.waitForFunction(
    (day) =>
      document.querySelector('[data-testid="payment-date"]')?.dataset.value === day &&
      !document.querySelector('[data-testid="payment-date-panel"]'),
    yesterday,
    { timeout: 60_000 }
  );
  await page.click('[data-testid="payment-submit"]');
  await page.waitForFunction(
    () => {
      const rows = document.querySelectorAll('[data-testid="purchase-ledger-row"]');
      return rows.length === 2 && rows[1].dataset.balance === "2000";
    },
    null,
    { timeout: 60_000 }
  );
  // Remove it again from the row (confirmation popup) so the vendor stays clean for the cleanup.
  await page.click('[data-testid="ledger-payment-delete"]');
  await page.click('[data-testid="ledger-payment-delete-confirm"]');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="purchase-ledger-row"]').length === 1,
    null,
    { timeout: 60_000 }
  );
});

uiTest("UI: inventory shows size chips for the sized product", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/inventory`);
  const row = page.locator('[data-testid="product-row"][data-product-name="E2E Slim Fit Denim"]');
  await row.waitFor({ timeout: 60_000 });
  expect(await row.innerText(), "size chips").toContain("32");

  // Increase-stock popup: the quantity box starts empty and the button stays disabled until a quantity is typed.
  const before = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  await row.locator('button[aria-label="Increase stock"]').click();
  const qty = page.locator('[data-testid="stock-update-qty"]');
  await qty.waitFor({ timeout: 60_000 });
  expect(await qty.inputValue(), "quantity starts empty").toBe("");
  expect(await page.locator('[data-testid="stock-update-submit"]').isDisabled(), "save disabled while empty").toBe(
    true
  );
  await page.locator('[data-testid="stock-size-select"] button').click();
  await page.locator('[data-testid="stock-size-select"] li', { hasText: "30" }).first().click();
  await qty.fill("2");
  await page.click('[data-testid="stock-update-submit"]');
  await page.waitForSelector('[data-testid="stock-update-form"]', { state: "detached", timeout: 60_000 });
  const after = (await api(S.admin, "GET", "/api/products")).body.find((p) => p._id === S.productId);
  expect(after.remaining - before.remaining, "stock +2 from the popup").toBe(2);
});

// =====================================================================
async function cleanup() {
  if (!S.admin) return;
  for (const id of S.ids.sales) await api(S.admin, "DELETE", `/api/sales/${id}`);
  for (const id of S.ids.purchases) await api(S.admin, "DELETE", `/api/purchases/${id}`);
  for (const id of S.ids.ledger) await api(S.admin, "DELETE", `/api/ledger/${id}`);
  for (const id of S.ids.workers) await api(S.admin, "DELETE", `/api/workers/${id}`);
  for (const id of S.ids.operations) await api(S.admin, "DELETE", `/api/operations/${id}`);
  for (const id of S.ids.lots) await api(S.admin, "DELETE", `/api/lots/${id}`);
  for (const id of S.ids.products) await api(S.admin, "DELETE", `/api/products/${id}`);
  for (const id of S.ids.vendors) await api(S.admin, "DELETE", `/api/vendors/${id}`);
  for (const id of S.ids.users) await api(S.admin, "DELETE", `/api/users/${id}`);
}

(async () => {
  console.log(`e2e: database ${DB}, server ${BASE}`);
  await dropTestDb();
  runBuild();
  startServer();
  let failed = 0;
  try {
    await waitForServer();
    for (const t of tests) {
      const started = Date.now();
      try {
        await t.fn();
        results.push({ name: t.name, ok: true, ms: Date.now() - started });
        console.log(`  ✓ ${t.name} (${Date.now() - started}ms)`);
      } catch (err) {
        failed++;
        results.push({ name: t.name, ok: false, ms: Date.now() - started, error: err.message });
        console.log(`  ✗ ${t.name}\n      ${err.message}`);
      }
    }
  } finally {
    await cleanup().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await dropTestDb();
    stopServer();
  }
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
