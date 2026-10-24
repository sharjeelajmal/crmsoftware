# AJ Garments CRM — Project Rules

Yeh file is project ka single source of truth hai for architecture, design system aur coding conventions.
Jab bhi is project mein koi kaam (feature, fix, refactor, redesign) karna ho, **pehle yeh file parhein, phir code likhein.**

---

## 1. Project Snapshot

| Item | Value |
|------|-------|
| Brand | **AJ Garments** — tagline "Style for every you" |
| App type | Internal CRM / admin portal (sales, inventory, customers, salesmen, purchasing, expenses, recovery, analytics, backup) |
| Framework | Next.js 16 (App Router), React 19 |
| Language | **JavaScript (`.js`)** — TypeScript use nahi hota. Naye files bhi `.js` mein likhein. |
| Styling | Tailwind CSS **v4** (CSS-first config) + `src/app/globals.css` |
| Database | MongoDB via `mongodb` driver (`src/lib/mongodb.js` → `getDb()`, `withTransaction()`) |
| Auth | Signed JWT (jose) in HttpOnly cookie + `src/proxy.js` gate on every page & API route |
| Validation | `zod` schemas in `src/lib/validation.js` |
| Fonts | Montserrat (`--font-sans`) for UI, Noto Nastaliq Urdu (`--font-urdu`) for Urdu text on invoices |
| PDF / Print | `html2canvas` + `jspdf` via `useInvoicePdf`, `@media print` CSS for browser print |
| Charts | `recharts` (colors via `useThemeColors`) |
| Animation | `framer-motion` (variants in `src/constants/animations.js`) |
| Icons | `lucide-react` |

---

## 2. Folder Structure

```text
src/
├── proxy.js                    # Auth gate (Next 16 "proxy", replaces middleware)
├── app/
│   ├── layout.js               # Root layout: fonts, metadata, ToastProvider, globals.css
│   ├── globals.css             # SINGLE source of design tokens (colors, shadows, fonts)
│   ├── favicon.ico
│   ├── login/page.js
│   ├── (dashboard)/            # Authenticated area
│   │   ├── layout.js           # Shell: Sidebar + DashboardHeader + page transition
│   │   └── <module>/page.js    # THIN orchestrator (< 250 lines): popup state + feature hook + layout
│   └── api/<resource>/route.js # Route handlers built with src/lib/api.js helpers
├── features/<module>/          # Everything page-specific (sales, inventory, …, cutting, lots, ledger)
│   ├── components/<Name>.js    # one component per file (popups, cards, rows, tables, views)
│   ├── hooks/use<Module>.js    # data loading + mutations (api-client + useAsyncData + useToast)
│   └── utils.js                # pure helpers (optional)
├── components/
│   ├── ui/                     # Modal, Dialogs (Confirm/Alert), Button, StatCard, FilterButton,
│   │                           # CustomDropdown/SelectDropdown, ToastProvider (useToast), Loader
│   ├── invoice/InvoiceDocument.js  # THE invoice layout (screen preview, PDF, print)
│   └── layout/                 # Sidebar, DashboardHeader
├── hooks/                      # useAsyncData, useInvoicePdf, useThemeColors
├── lib/
│   ├── mongodb.js              # getClient / getDb / withTransaction
│   ├── auth.js                 # session token create/verify, cookie options
│   ├── api.js                  # route(), ok/created, ApiError, parseBody/parseQuery, requireObjectId
│   ├── validation.js           # zod schemas = the API contract
│   ├── api-client.js           # browser: api.get/post/put/delete, ApiClientError, errorMessage
│   ├── dates.js                # dateRangeFromFilter / dateQuery
│   ├── balances.js             # customer balance aggregations
│   ├── inventory.js            # deductStock / restoreStock
│   ├── sales.js, analytics.js, users.js, format.js, pdf.js
└── constants/                  # brand.js (BRAND, BUSINESS), navigation.js, animations.js
public/
├── aj-logo.png                 # Square brand monogram (sidebar, loader, invoices, avatar)
├── aj-logo-full.png            # Full horizontal logo with wordmark + tagline (login)
└── logo.png                    # Legacy copy for old DB avatar paths only
```

Rules:
- Naye folders sirf tab banayein jab genuinely zaroorat ho. `types/` nahi banana (JS project hai).
- Component jo **do ya zyada modules** mein use ho → `src/components/ui/`. Sirf ek module ka → `src/features/<module>/components/`.
- Business logic (DB queries, calculations) API routes / `lib/` mein; pages sirf UI state aur composition.
- Limits: koi file 400 lines se bari nahi, koi line 140 chars se lambi nahi, page file mein sirf page component define ho.

---

## 3. Design Tokens — `globals.css` is the ONLY place for colors

**Sab color codes sirf `src/app/globals.css` ke `@theme inline { ... }` block mein define hote hain.**
Tailwind v4 is block ke har token ko `:root` par CSS variable ke taur par emit karta hai (isliye `var(--color-primary)` har jagah available hai) aur saath hi utility classes banata hai.
Kisi bhi `.js` file mein raw hex (`#0037A6`), `rgb()`/`rgba()` ya Tailwind arbitrary color (`bg-[#...]`) likhna **mana hai**.

### 3.1 Color palette (AJ Garments theme)

| Token | Purpose |
|-------|---------|
| `--color-primary` | Brand blue `#0037A6` — buttons, active nav, headings, table headers, stat cards |
| `--color-primary-hover` | Darker blue for hover/active states |
| `--color-primary-light` | Lighter blue (logo wave) for gradients/accents |
| `--color-primary-soft` | Very light blue tint — selected rows, calendar bg, subtle highlights |
| `--color-primary-glow` | Translucent blue for shadows/glows |
| `--color-background` | App page background |
| `--color-surface` | Cards, sidebar, inputs (white) |
| `--color-surface-muted` | Invoice header/footer, soft panels |
| `--color-surface-glass` | Translucent white (chart tooltips, overlays) |
| `--color-text-primary` / `-secondary` / `-muted` | Main / meta / placeholder text |
| `--color-border` / `--color-border-strong` | Default borders / strong dividers |
| `--color-success*`, `--color-danger*`, `--color-warning` | Semantic states |

Shadows (Tailwind ke default `shadow-sm/md/lg` ko override nahi karte): `--shadow-soft`, `--shadow-card-hover`,
`--shadow-overlay`, `--shadow-brand` (framer `whileHover` mein `boxShadow: "var(--shadow-brand)"`).
Fonts: `--font-sans`, `--font-urdu`. Radius: Tailwind default scale.

### 3.2 Tailwind classes

```text
bg-primary text-primary border-primary ring-primary shadow-primary  (+ /5, /10 … opacity modifiers)
bg-background bg-surface bg-surface-muted
text-text-primary text-text-secondary placeholder-text-muted
border-border border-border-strong
bg-success-soft border-success-border text-success · bg-danger-soft border-danger-border text-danger
font-sans font-urdu
```
Tailwind ki neutral palette (`text-gray-500`, `bg-gray-100`, `border-gray-200`, `text-red-600`) generic greys/states ke liye allowed hai —
lekin **brand color ke liye hamesha `primary` token**, kabhi `bg-blue-700` nahi.

### 3.3 Inline styles (invoice / html2canvas) → sirf `var(--color-*)`.
### 3.4 JS mein resolved hex (recharts) → `const colors = useThemeColors(); colors.primary`.
### 3.5 Third-party CSS (react-day-picker) → `--rdp-accent-color: var(--color-primary); --rdp-background-color: var(--color-primary-soft);`

---

## 4. Brand & Business Constants

`src/constants/brand.js`: `BRAND` (name, slug, email, logo paths) aur `BUSINESS` (invoice address, contacts, bank accounts,
Urdu note, timezone offset). Components mein yeh text kabhi hardcode na karein. Page `<title>` root layout mein `BRAND` se.

---

## 5. Authentication & Security

- Login: `POST /api/auth/login` → bootstrap env admin (`FIRST_USER_NAME/PASS`) ya `users` collection (bcrypt). Success par
  `aj_session` HttpOnly cookie (JWT, 7 din) set hoti hai — `src/lib/auth.js`.
- `src/proxy.js` har request par session verify karta hai: page → `/login?next=…` redirect, `/api/*` → `401 JSON`.
  Public paths sirf `/login`, `/api/auth/login`, `/api/auth/logout`.
- Logout: `POST /api/auth/logout` (Sidebar handle karta hai). Browser mein cookie set/read karne wala koi code nahi (js-cookie hata diya gaya).
- `AUTH_SECRET` (≥ 32 chars) `.env` mein lazmi hai; `.env` kabhi commit nahi hota (`.env.example` dekhein).
- Passwords ko kabhi log na karein. Plain-text legacy passwords login par automatically hash ho jate hain.

---

### 5.1 Roles
- Roles: `admin` (sab kuch) aur `cutting_master` (sirf cutting portal) — `src/constants/roles.js` (`ROLES`, `roleLabel`, `ROLE_HOME`, `isPathAllowedForRole`).
- JWT mein `role` hota hai; `src/proxy.js` path-level guard lagata hai (cutting master: `/cutting/**`, `/profile`, `/api/lots*`, `GET /api/products`, `/api/profile*`).
- Har route `route(handler, { roles })` se banta hai; default `roles = [ROLES.ADMIN]`. Jo route cutting master ko chahiye wahan explicitly `{ roles: ALL_ROLES }`. Handler ko `context.session` (`{ sub, name, role }`) milta hai.
- Users admin page se bante hain (`/api/users`). Last admin kabhi delete/demote nahi ho sakta; apna account deactivate nahi kar sakte.
- Nav role ke hisaab se `navForRole(role)` (`src/constants/navigation.js`) se aata hai.

## 6. API Routes

Har route `src/lib/api.js` ke helpers se banta hai:

```js
import { getDb } from "@/lib/mongodb";
import { route, ok, created, parseBody, requireObjectId, notFound, conflict } from "@/lib/api";
import { productSchema } from "@/lib/validation";

export const POST = route(async (request) => {
  const product = await parseBody(request, productSchema);   // zod → 400 on failure
  const db = await getDb();
  const { insertedId } = await db.collection("products").insertOne(product);
  return created({ _id: insertedId, ...product });
});
```

- `route()` errors ko map karta hai: `ApiError` → apna status, `ZodError` → 400 `{ error, issues }`, baqi → 500 (server par logged).
- Conventions: create → 201 + created doc, update → `{ updated: true }`, delete → `{ deleted: true }`, missing → `notFound()`, duplicate → `conflict()`.
- Dynamic params: `requireObjectId(context)` / `requireParam(context, "name")`. Kabhi `new ObjectId(id)` bina validate na karein.
- DB name sirf `src/lib/mongodb.js` mein (`MONGODB_DB` env, fallback `crm-software-copy`). Routes mein `DB_NAME` constant mana hai.
- Multi-collection writes (sale + stock, purchase + stock, link sale + salesman) → `withTransaction(async (db, session) => …)`.
- Date filters → `dateRangeFromFilter()` + `dateQuery()` from `src/lib/dates.js`.
- Shared domain logic → `src/lib/balances.js`, `inventory.js`, `sales.js`, `analytics.js`. Routes patle rahein.
- Naya resource = `validation.js` mein schema + route + (agar page ko chahiye) feature hook.

---

## 7. Pages & Features

- Page files `"use client"` orchestrators hain: popup/filter state + `use<Module>()` hook + layout. Data fetching hook mein, JSX components mein.
- Data loading: `useAsyncData(() => api.get(url), [deps], { cacheKey })` → `{ data, isLoading, isFetching, error, reload }`. Mutations ke baad `reload()`.
  `cacheKey` hamesha dein (request badalne wali har cheez key mein ho, e.g. `purchasing:${filter}`): dobara visit par cached data foran dikhta hai aur background mein refresh hota hai (stale-while-revalidate). `isLoading` sirf pehli load par true hota hai — full-page `Loader` sirf tab dikhayein.
- Page transition (`(dashboard)/layout.js`) sirf 0.18s fade hai, exit animation nahi — navigation ko slow karne wali koi animation na add karein.
- Network: hamesha `api` from `@/lib/api-client` (JSON, `cache: "no-store"`, 401 → login redirect). Direct `fetch()` sirf blob downloads (CSV) ke liye.
- Errors/notifications: `useToast()` (`toast.success/error/info`). `window.alert` / per-page NotificationPopup mana hai.
- Confirmations: `<ConfirmDialog>`; info: `<AlertDialog>`; forms/popups: `<Modal size padded>` within `<AnimatePresence>`.
- **Hidden modules**: `src/constants/modules.js` (`HIDDEN_MODULES`, `isHiddenPath`, `isModuleVisible`) — sidebar (`navForRole`), proxy redirect,
  dashboard cards aur quick actions isi se chalte hain. Naya link/card jo kisi module ke page par le jaye, `isModuleVisible(path)` check kare.
- **Dashboard** (`/`): sara data ek call `GET /api/dashboard` (`src/lib/dashboard.js`, pure rules `src/constants/dashboard.js`), cards
  `src/features/dashboard/components/*` (har card `Panel` frame mein). Chart colours sirf tokens `--color-chart-1..3` (yehi tarteeb, colour-blind
  check ho chuki); chart ki har value text ya table mein bhi ho. Ginti wale numbers `AnimatedNumber`, chhoti trend line `Sparkline`.
- Standard pieces: `StatCard`, `FilterButton`, `Button`, `CustomDropdown` (string options) / `SelectDropdown` ({value,label}), `Loader`,
  `Collapse` (height + fade expand/collapse), `DateRangePickerModal` (har "Custom range" ke liye yahi — presets, live From → To,
  `initialRange` / `onApply(range)` / `onClose`; calendar theme `.rdp-root.rdp-modern` globals.css mein). Naya dropdown banana ho to native `<select>` ke bajaye `SelectDropdown`: `size="sm"` table cells ke liye
  (option ka `short` button par dikhta hai), `portal` jab parent mein `overflow` ho (menu `<body>` par, `.dropdown-portal` z 60).
- Animations: `containerVariants` / `itemVariants` from `@/constants/animations`. List ki har row/card (jo filter, search ya tab
  badalne par dobara mount hoti hai) apne motion element par `initial="hidden" animate="visible"` lagaye — warna parent ki animation
  khatam ho chuki hoti hai aur nayi row `opacity: 0` par atak jati hai (cards gayab). e2e Lots search se isko check karta hai.
- `useEffect` deps sahi hon; `eslint-disable` sirf comment ke saath justified.

### 7.1 Responsive (phone → tablet → desktop)
- Breakpoints: `sm` 640 (bare phones/landscape), `md` 768 (tablet), `lg` 1024 (sidebar docked), `xl` 1280.
- Shell: `lg` se neeche sidebar drawer hai (header ka menu button), `lg+` par docked/collapsible. Document kabhi scroll nahi karta; sirf `<main>`.
  `<main>` `relative` hai taake `absolute`/`sr-only` elements usi ke andar rahein; kisi component mein `absolute` ya `sr-only` lagayein to
  uska parent bhi `relative` rakhein (warna `<html>` lamba ho kar doosra scrollbar aa jata hai — e2e isko check karta hai).
- Har page ka toolbar phone par stack ho: search `w-full sm:w-72`, buttons `w-full sm:w-auto`, filters `flex-wrap` ya `grid grid-cols-N sm:flex`.
- Filter pills grid mein hon to `FilterButton wrap` (text box ke andar wrap, bahar nahi), lambe naam ka phone label chhota rakhein
  (`<span className="sm:hidden">Ready</span><span className="hidden sm:inline">Ready for Sale</span>` + `title`), aur 360px se
  chhote phones par columns kam: `grid-cols-2 min-[360px]:grid-cols-3 sm:flex`. 280–414px par check karein.
- Tables: `md` se neeche column header `hidden md:flex` aur har row card ban jaye (labelled values + actions line). Popups ke tables mein secondary column (date/customer) phone par primary cell ke neeche chhote text mein.
- Cards/sections: padding `p-4 sm:p-6`, grid gap `gap-4 sm:gap-6`, headings `text-3xl sm:text-4xl`.
- Invoice preview hamesha `InvoicePreview` (scale-to-fit); DayPicker phone par `numberOfMonths={1}` (`useMediaQuery`).
- Verify: 320/360/390 (phone), 820 (tablet), 1024+ (desktop) — kahin horizontal overflow nahi (`document.documentElement.scrollWidth <= innerWidth`).

---

## 7.2 Product sizes & stock
- Product optional `sizes: [{ size, remaining }]`; `remaining` hamesha total hai (server `withSizeTotals` se sync rakhta hai).
- Stock sirf `src/lib/inventory.js` se badalta hai: `deductStock`/`restoreStock` (sale items `productId` + optional `size`), `addStock(db, productId, qty, { size })` (purchases, production). Kabhi direct `$inc remaining` route mein na likhein.
- Sized product bechte/kharidte waqt size lazmi; unsized product pehle jaisa.
- Unsized product ko sizes dena sirf `EditProductPopup` ke "Track stock per size" se (`sizeSplitHint` farq dikhata hai; PUT `sizes` bhejne par server total recompute karta hai). Sizes hataane ka koi UI nahi — data loss se bachne ke liye.

## 7.3 Production lots
- Collections `lots` + `lot_events` (append-only history). Rules `src/lib/lots.js` mein: `STAGES`, `nextLotSeq` (LOT-1001 se), `buildLot`, `buildLotEvent`, `canViewLot` / `canEditCutting` / `canDeleteLot`.
- Ek lot = ek product. Cutting data sirf `stage === "cutting"` par edit; delete sirf admin, sirf cutting stage.
- Stage transitions sirf `applyStageAction` (`src/constants/lots.js`, pure, client-safe) se: `send_stitching` (cutting→stitching), `stitched` (qty ≤ cutQty → washing), `washed` (qty ≤ stitchedQty → packing). Route: `POST /api/lots/:id/stage` (admin). Har action = `lot_events` entry. Shortfall `lotShortfall(lot)` se.
- Client code lot constants sirf `@/constants/lots` se import kare (`@/lib/lots` mongodb import karta hai, browser bundle mein nahi ja sakta).
- `ready` action (packing → ready) `src/lib/production.js` → `markLotReady`: `addStock` per size (product sized ho to) transaction ke andar, `stockApplied: true` (dobara kabhi nahi), `readySizes`, product par `lastProduction`, `stock_movements` entry. Reverse sirf `POST /api/lots/:id/reverse` (admin, reason lazmi) → `reverseLotReady`. Stock ko production se badalne ka aur koi raasta na banayein.
- `stock_movements` append-only audit hai (`recordStockMovement`); kabhi edit/delete nahi. Report: `GET /api/lots/report` (+ `format=csv`). Produced pieces (widget/analytics) hamesha `producedPiecesInRange` (net: `lot_ready` + `lot_reversed`) se — lots ko dobara count na karein.
- **Gate passes** (`gate_passes`, snapshot — kabhi edit nahi): rules `src/constants/gatepass.js` (`GATE_PASS_FOR_ACTION`, `sizeRangeOf`, `gatePassPiecesFor`, `canIssueGatePass`), server `src/lib/gatepass.js` (`issueGatePass` stage route ke transaction ke andar). Lot par `bundleNumber`, `shrinkage` (%), `washType`. Print layout `GatePassDocument` (inline `var(--color-*)`), print area `#gate-pass-print`; phone numbers sirf `BUSINESS.gatePass` se.
- **Stitching se partial outs** (Phase 7b): `POST /api/lots/:id/dispatch` (admin) — washing gate pass `partial: true` sirf un pieces ka, lot par
  `stitchOutQty` (+). Rules `stitchBalanceOf` / `minQtyFor` (`src/constants/lots.js`), `dispatchProblem` / `finalWashingPieces`
  (`src/constants/gatepass.js`). `stitched` action pieces ≥ `stitchOutQty`; stage route aakhri pass sirf baqi pieces ka banata hai.
- **Loose Items & B-Pair register** (`ledger_entries`, admin): constants `src/constants/ledger.js` (types, units, `shortfallEntryFor`, totals/filter), server `src/lib/ledger.js` (`buildLedgerEntry`, `ledgerEditOps` → har edit `history[]` mein snapshot), routes `/api/ledger` + `/api/ledger/:id`. Ledger ka stock se **koi link nahi**: yeh code kabhi `products`, `stock_movements`, `inventory.js` ya `production.js` ko import/touch na kare (`tests/unit/ledger.test.js` isko enforce karta hai). Lot shortfall se shortcut `/ledger?lot=<id>` (`useLedgerShortcut`).

## 7.4 Workers & wages
- Collections `workers`, `operations` (rate per piece, editable), `work_entries` (lot × operation × worker × pieces; `rate`, `amount`, naam snapshot — purani wages kabhi nahi badalti), `wage_adjustments` (advance / deduction / bonus).
- Pure maths sirf `src/constants/wages.js` (`entryAmount`, `perPieceLabour`, `splitEvenly`, `summarizeWages`); server `src/lib/wages.js`. Routes: `/api/workers`, `/api/operations`, `/api/work-entries` (POST = ek operation kai workers ko), `/api/wages/report` (+csv), `/api/wage-adjustments`.
- Chhutti (leave): worker ka `dailyRate` (per-day salary) hota hai; `wage_adjustments` mein `type: "leave"` = `days` × `rate`
  (rate snapshot, default worker ka dailyRate, aadha din allowed). Net = wages + bonus − leave − advance − deduction; advance
  usi period mein poora katta hai jismein diya gaya. Math `leaveAmount` / `summarizeWages` (`src/constants/wages.js`).
- Worker/operation jo use ho chuka ho delete nahi hota (409) — `active: false` karein. Wage periods `dates.js` mein: `thisweek` (Mon–Sun), `lastweek`, `last15days`, `monthly`.
- Wages ka stock/products se koi link nahi.

## 7.5 Tests
- Unit: `npm test` (Vitest, `tests/unit/**`): pure logic — validation schemas, roles, auth tokens, inventory ops, lots rules. Naya lib helper = naya test.
- E2E: `npm run test:e2e` (`tests/e2e/run.js`): alag DB (`MONGODB_DB=crm-e2e`) par apna dev server (port 3100) chala kar API + browser (Edge channel) scenarios. Koi test production DB ko touch nahi karta.
- Har phase ke aakhir mein: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`.

## 8. Invoices, PDF & Print

- Ek hi layout: `src/components/invoice/InvoiceDocument.js` (`<InvoiceDocument sale forPDF id />`). Nayi copy kabhi na banayein.
- `sale` object = `sales` collection document shape (`invoiceNumber, invoiceDate, customerName, customerPhone, items, subTotal, others, discount, total, receivedAmount, balance`).
- PDF: `const { downloadInvoicePdf } = useInvoicePdf(); await downloadInvoicePdf(sale)` (offscreen render → html2canvas → jsPDF, lazy-loaded).
- Browser print: content ko `<div id="invoice-section">` mein wrap karein; buttons par `no-print`.
- Sale items mein `productId` bhejein jab product list se chuna gaya ho (stock id se match hota hai; purane records name se).

---

## 9. Code Style

- 2-space indent, double quotes, semicolons. Comments Roman Urdu ya English, lekin "FIX"/"UPDATED" jaisi narrative comments nahi.
- `"use client"` sirf jahan hooks/browser APIs chahiye. `next/image` for images (InvoiceDocument mein plain `<img>` justified hai), `next/link` for links.
- Koi naya dependency add karne se pehle existing (`lucide-react`, `date-fns`, `framer-motion`, `zod`, `jose`) check karein.
- `console.log` production code mein nahi; sirf `console.error` catch blocks mein.
- Dark mode supported **nahi** hai — `prefers-color-scheme: dark` overrides na likhein.

---

## 10. Checklist — har task ke baad verify karein

- [ ] `grep -rE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" src --include=*.js` khali ho (globals.css ke ilawa koi color nahi).
- [ ] `grep -rn "alert(\|fetch(" src/app src/features` — koi `alert`, koi direct `fetch` (CSV download ke ilawa) nahi.
- [ ] Naya color → `globals.css` `@theme inline` (aur chart ke liye `useThemeColors` TOKENS).
- [ ] Brand/business text `BRAND`/`BUSINESS` se aa raha hai.
- [ ] Naya API input `validation.js` schema se guzarta hai; route `route()` wrapper use karta hai.
- [ ] Page file < 250 lines, components feature folder mein, shared cheezein `components/ui` mein.
- [ ] `npm run lint` aur `npm run build` pass; UI visually same; responsive layout intact.
- [ ] PDF export aur browser print par theme colors sahi aate hain.
