# AJ Garments CRM

Internal admin portal for AJ Garments: sales & invoicing, inventory (with per-size stock), customers, salesmen,
purchasing, expenses, recovery (dues), analytics, CSV backups — plus the factory modules: cutting portal,
production lots (cutting → stitching → washing → packing → ready), automatic stock sync and the
Loose Items & B-Pair register.

Stack: **Next.js 16 (App Router, JavaScript)** · React 19 · Tailwind CSS v4 · MongoDB · framer-motion · recharts.

## Getting started

```bash
cp .env.example .env     # fill in MONGODB_URI, FIRST_USER_NAME/PASS, AUTH_SECRET
npm install
npm run dev              # http://localhost:3000
```

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Other scripts: `npm run build`, `npm start`, `npm run lint`, `npm test` (unit, Vitest), `npm run test:e2e`
(production build + isolated server on port 3100 + database `crm-e2e`; needs Microsoft Edge for Playwright;
`E2E_MONGODB_URI` in `.env` overrides the connection string when the machine's DNS cannot resolve `mongodb+srv`).

## How it is organised

```text
src/
├── proxy.js                 # auth gate: verifies the session cookie on every page + API request
├── app/
│   ├── globals.css          # design tokens (colors, shadows, fonts) — the only place colors live
│   ├── login/               # login page
│   ├── (dashboard)/         # authenticated shell + one thin page.js per module
│   └── api/<resource>/      # route handlers (validation + db, no business logic in pages)
├── features/<module>/       # page-specific components + data hooks (components/, hooks/)
├── components/
│   ├── ui/                  # Modal, Dialogs, Button, StatCard, FilterButton, dropdowns, Toast, Loader
│   ├── invoice/             # InvoiceDocument — the single invoice layout (screen, PDF, print)
│   └── layout/              # Sidebar, DashboardHeader
├── hooks/                   # useAsyncData, useInvoicePdf, useThemeColors
├── lib/                     # mongodb, auth, api (route helpers), validation (zod), api-client, pdf, …
└── constants/               # brand & business details, navigation, animation variants
```

Read [Rules.md](Rules.md) before changing anything — it documents the conventions
(design tokens, API helpers, validation, feature folders) that keep this codebase consistent.

## Roles & production modules

| Role | Sees | Docs |
|---|---|---|
| `admin` | everything: CRM, Lots, Lot Report, Ledger, Users | [docs/guide-admin.md](docs/guide-admin.md) |
| `cutting_master` | only `/cutting` (own lots, new cutting entry) and `/profile` | [docs/guide-cutting-master.md](docs/guide-cutting-master.md) |

- **Lots**: one lot = one article; stage actions in `src/constants/lots.js` (pure) and `src/lib/lots.js`; `POST /api/lots/:id/stage`.
- **Stock sync**: "Ready for Sale" adds pieces per size exactly once (`src/lib/production.js`), audited in `stock_movements`;
  admin can reverse with a reason. Inventory shows the last production chip and a stock history per product.
- **Ledger** (`/ledger`): manual register for B-pair / accessories / fabric with edit history, CSV and print. Never touches stock.
- **Gate passes**: issued automatically when a lot goes to stitching (bundle no., sizes, pieces, shrinkage %) and to washing
  (pieces, wash type); printable from the lot page with the factory phone numbers on top and bottom.
- **Workers & Wages** (`/workers`, `/wages`): stitching operations with per-piece rates, work assigned per lot
  (operation → workers → pieces, rate snapshotted), wages per worker per week / 15 days / month with CSV and print.
- Plan, phases and verification: [docs/factory-modules-plan.md](docs/factory-modules-plan.md),
  `docs/phase-N-checklist.md` and the client guide [verification.html](verification.html) (chapters in Roman Urdu: steps, expected result, Theek hai / Masla hai, WhatsApp report).

## Authentication

Login issues a signed JWT in an `HttpOnly` cookie (`src/lib/auth.js`). `src/proxy.js` rejects
unauthenticated page requests (redirect to `/login`) and API requests (`401`). Until a user exists in
the `users` collection, the `.env` bootstrap credentials (`FIRST_USER_NAME` / `FIRST_USER_PASS`) work.
