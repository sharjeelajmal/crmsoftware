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
    const client = new MongoClient(ENV.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
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
const S = {
  admin: null,
  cutter: null,
  cutter2: null,
  ids: { users: [], products: [], lots: [], sales: [], purchases: [], vendors: [] },
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
  expect(created.body.lotNumber, "lot number").toBe("LOT-1001");
  expect(created.body.cutQty, "cut qty").toBe(70);
  expect(created.body.stage, "stage").toBe("cutting");
  S.lotId = created.body._id;
  S.ids.lots.push(S.lotId);

  const detail = await api(S.cutter, "GET", `/api/lots/${S.lotId}`);
  expect(detail.status, "detail").toBe(200);
  expect(detail.body.events.map((e) => e.type).join(","), "events").toBe("created");

  const edited = await api(S.cutter, "PUT", `/api/lots/${S.lotId}`, {
    sizes: [
      { size: "30", qty: 30 },
      { size: "32", qty: 45 },
    ],
  });
  expect(edited.status, "edit").toBe(200);
  expect(edited.body.cutQty, "cut qty after edit").toBe(75);
  const after = await api(S.cutter, "GET", `/api/lots/${S.lotId}`);
  expect(after.body.events.map((e) => e.type).join(","), "events after edit").toBe("created,edited");

  const second = await api(S.cutter, "POST", "/api/lots", {
    productId: S.productId,
    fabric: { name: "Denim", qty: 10 },
    sizes: [{ size: "34", qty: 10 }],
  });
  expect(second.body.lotNumber, "sequence").toBe("LOT-1002");
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
  expect(await csv.text(), "csv body").toContain('"Lot #"');
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
});

uiTest("UI: admin sees the lots list, the dashboard widget and the users page", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.waitForSelector('[data-testid="production-widget"]', { timeout: 60_000 });
  await page.goto(`${BASE}/lots`);
  await page.waitForSelector('[data-testid="lots-row"]', { timeout: 60_000 });
  expect((await page.locator('[data-testid="lots-row"]').count()) >= 3, "lots listed").toBe(true);
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
  await page.waitForSelector('[data-testid="lot-stage-panel"][data-panel-state="locked"]', { timeout: 60_000 });
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

uiTest("UI: inventory shows size chips for the sized product", async (page) => {
  await browserLogin(page, ENV.FIRST_USER_NAME, ENV.FIRST_USER_PASS);
  await page.goto(`${BASE}/inventory`);
  const row = page.locator('[data-testid="product-row"][data-product-name="E2E Slim Fit Denim"]');
  await row.waitFor({ timeout: 60_000 });
  expect(await row.innerText(), "size chips").toContain("32");
});

// =====================================================================
async function cleanup() {
  if (!S.admin) return;
  for (const id of S.ids.sales) await api(S.admin, "DELETE", `/api/sales/${id}`);
  for (const id of S.ids.purchases) await api(S.admin, "DELETE", `/api/purchases/${id}`);
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
