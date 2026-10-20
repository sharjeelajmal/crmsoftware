# AJ Garments CRM

Internal admin portal for AJ Garments: sales & invoicing, inventory, customers, salesmen,
purchasing, expenses, recovery (dues), analytics and CSV backups.

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

Other scripts: `npm run build`, `npm start`, `npm run lint`.

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

## Authentication

Login issues a signed JWT in an `HttpOnly` cookie (`src/lib/auth.js`). `src/proxy.js` rejects
unauthenticated page requests (redirect to `/login`) and API requests (`401`). Until a user exists in
the `users` collection, the `.env` bootstrap credentials (`FIRST_USER_NAME` / `FIRST_USER_PASS`) work.
