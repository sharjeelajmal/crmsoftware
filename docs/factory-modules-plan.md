# Factory Production Modules — Phase-wise Plan

Source: client proposal (Factory Production Modules, CRM add-on). Yeh document us proposal ko mojooda codebase ke
hisaab se phases mein todta hai. **Abhi sirf plan hai, implementation nahi.** Har phase ke aakhir mein "Done ka matlab"
(acceptance) likha hai taake agle phase se pehle confusion na ho.

---

## 0. Scope ek nazar mein (proposal se)

| # | Module | Kaun use karega | Ek line mein |
|---|--------|-----------------|--------------|
| M1 | Cutting Portal | Cutting master (alag login), Admin dekh sakta hai | Naya lot: article, kapra, size-wise pieces. Save hote hi admin ko dikhe. |
| M2 | Operations & Tracking | Admin | Lot pipeline: Cutting → Stitching → Washing (manual) → Packing → Ready. Har stage ki miqdar aur farq. |
| M3 | Automated Inventory Sync | System (Admin sirf Ready mark kare) | Ready hote hi tayar pants article + size ke hisaab se dukaan ke stock mein plus. Ek lot sirf ek dafa. Reverse sirf Admin, history ke saath. |
| M4 | Loose Items & B-Pair | Admin | Alag manual register (B-pair, accessories, fabric). Main stock se koi link nahi. |

Saath mein: dashboard widget (naye / process mein lots), lot report (stage-wise, tareekh-wise), access matrix (cutting master ko
sirf apna portal), users/roles aur training.

**Scope se bahar (proposal ke mutabiq):** karigaron ki mazdoori/commission, washing vendor ka hisaab, kapre ki purchase/costing.

---

## 1. Mojooda codebase se mapping (kya hai, kya nahi)

| Zaroorat | Abhi codebase mein | Farq / kaam |
|----------|--------------------|-------------|
| Roles (Admin vs Cutting master) | Ek hi admin user, JWT mein role nahi, `proxy.js` sirf "logged in ya nahi" dekhta hai | `users.role`, JWT mein `role`, proxy + API par role guard, sidebar role ke hisaab se |
| Article = dukaan ka product | `products` collection: `name, category, purchasePrice, salePrice, remaining` | Article = existing product. **Sizes ka koi model nahi** (neeche Decision D1) |
| Stock plus | `remaining` number, `src/lib/inventory.js` (sale par minus) | Lot Ready par plus karne wala helper + stock movement log |
| Lot / pipeline | Kuch nahi | Nayi collections: `lots`, `lot_events` |
| Register | Kuch nahi | Nayi collection: `ledger_entries` |
| Lot number | `sales` ke liye `nextInvoiceNumber` pattern hai | Wahi pattern `lots` ke liye (`LOT-1001`) |
| Transactions / validation / toast / UI kit | Sab maujood (`withTransaction`, zod, `route()`, `ui/`) | Reuse, naya kuch nahi |

### Decisions jo Phase 0 se pehle chahiye (client se poochne wale)

- **D1 — Sizes:** Proposal size-wise stock dikhata hai (30/32/34/36), lekin abhi products mein size nahi hai. Do raaste:
  - (a) Product mein `sizes: [{ size, remaining }]` add karein; `remaining` = sizes ka total. Sales par bhi size chunna hoga (bara change).
  - (b) Stock sirf total mein plus ho; size-wise sirf lot ke andar record rahe (reporting ke liye). Sales waise hi chalein.
  - **Sifarish:** pehle (b) se shuru, kyunke mojooda sales/inventory flow nahi tootta; (a) baad mein alag phase ban sakta hai.
- **D2 — Kitne cutting masters?** Ek ya kai? (Role design dono handle karega, lekin "apne lots" ka filter `createdBy` par hoga.)
- **D3 — Lot edit/delete rules:** Ready se pehle Admin edit/delete kar sake (proposal ke mutabiq), cutting master sirf jab tak lot "draft/bheja gaya" ho aur stitching shuru na hui ho? Confirm.
- **D4 — Reverse:** Ready reverse karne par stock minus aur event log; kya reverse ke baad lot dobara Ready ho sakta hai? (Sifarish: haan, lekin history mein dono entries.)
- **D5 — Lot number format:** `LOT-1001` se shuru, sirf barhta hai (sifarish).

---

## 2. Data model (final shape, Phase 0 mein finalize)

```text
users              { name, email, password, role: "admin" | "cutting_master", active, createdAt }
lots               { lotNumber, productId, productName, fabric: { name, qty, unit },
                     sizes: [{ size, qty }], cutQty,
                     stage: "cutting" | "stitching" | "washing" | "packing" | "ready",
                     stitchedQty, washedQty, packedQty, readyQty,
                     stockApplied: bool, stockAppliedAt, reversedAt,
                     createdBy (userId), createdAt, updatedAt }
lot_events         { lotId, type: "created" | "sent_stitching" | "stitched" | "washed" | "packing" | "ready" | "reversed" | "edited",
                     qty, note, by (userId, name, role), at }
ledger_entries     { type: "bpair" | "accessory" | "fabric", item, qty, unit, note, lotId?, by, createdAt, updatedAt }
stock_movements    { productId, qty (+/-), reason: "lot_ready" | "lot_reversed" | "sale" | "purchase" | "manual",
                     refId (lotId/saleId/purchaseId), by, at }      // Phase 3 mein; sale/purchase baad mein is par aa sakte hain
```

Indexes: `lots.lotNumber` unique, `lots.stage`, `lots.createdBy`, `lot_events.lotId`, `ledger_entries.type`, `stock_movements.productId`.

---

## 3. Phases (priority order)

### Phase 0 — Foundation: roles, data model, scaffolding  (pehle yeh, warna baqi sab adhoora)

**Kyun pehle:** Cutting master ka alag login aur "sirf apna portal" poore proposal ki buniyad hai; lots/ledger ka schema ek dafa
sahi ho jaye to baad mein migration nahi karni parti.

Deliverables:
- `users.role` (`admin` default for existing user), JWT payload mein `role`, `src/lib/auth.js` mein `requireRole()`.
- `src/proxy.js`: role-aware routing — cutting master sirf `/cutting/**` aur `/api/cutting/**`; baqi sab par redirect/403.
- API helper: `route(handler, { roles: ["admin"] })` ya `requireRole(request, "admin")`.
- Admin ke liye **Users** page (naya user: naam, email, password, role; active/inactive). (Proposal: "Users aur roles".)
- Sidebar role ke hisaab se: cutting master ko sirf "My Lots", "New Cutting", "Profile", "Log Out".
- `lots`, `lot_events`, `ledger_entries` ke zod schemas + `src/lib/lots.js` (lot number sequence, stage transitions ki table).
- Rules.md update: roles, naye folders (`features/cutting`, `features/lots`, `features/ledger`).

Done ka matlab: cutting master login kar ke sirf apna (abhi khali) portal dekhta hai; admin ko sab kuch pehle jaisa; admin naya user bana sakta hai.

---

### Phase 1 — Module 1: Cutting Portal  (client ko sab se pehle yahi dikhana hai)

Deliverables:
- Pages (`/cutting`): **My Lots** (list + status badge), **New Cutting Entry** (article dropdown = products, kapra naam/miqdar, size rows with qty, total auto), lot detail (read-only).
- API: `POST /api/lots` (cutting master/admin), `GET /api/lots?mine=1`, `GET /api/lots/:id`, `PUT /api/lots/:id` (sirf stage=cutting, apna lot), `DELETE` (admin, stage=cutting).
- `lot_events: created` har lot par.
- Admin side: Lots list (sab lots, stage filter) — abhi sirf dekhna; dashboard widget "Naye lots".

Done ka matlab: cutting master lot banata hai, admin ko usi waqt list aur dashboard widget mein dikhta hai; cutting master dusre pages nahi khol sakta.

---

### Phase 2 — Module 2: Operations & Tracking (Admin pipeline)

Deliverables:
- `/lots` page (admin): pipeline view (5 columns ya stage tabs), lot card: article, cut qty, current stage, farq.
- Lot detail: stage actions —
  - "Send to stitching" → stage `stitching`;
  - "Stitched received" (qty ≤ cutQty) → `stitchedQty`;
  - "Washing entry" (qty ≤ stitchedQty) → `washedQty`, stage `washing` done;
  - "In Packing" → stage `packing`;
  - (Ready button Phase 3 mein).
- Har action = `lot_events` entry + validation ke saath (ulta stage allowed nahi, qty limits).
- Farq panel: cut − stitched − washed, har stage par.
- Lot history timeline (events).
- Report: stage-wise pending/ready lots, date range (expenses/analytics wale `dateRangeFromFilter` reuse), CSV export (backup pattern reuse).
- Dashboard widget update: "process mein lots".

Done ka matlab: ek lot cutting se packing tak admin chala sakta hai, har qadam history mein, farq saaf dikhta hai, report nikalti hai.

---

### Phase 3 — Module 3: Automated Inventory Sync  (sab se sensitive: paison/stock se juda)

Deliverables:
- "Mark Ready for Sale" (admin): `withTransaction` mein — lot `stage: ready`, `readyQty = washedQty` (ya packed), product `remaining += readyQty`, `stockApplied: true`, `stock_movements` entry `lot_ready`, `lot_events: ready`.
- Idempotency: `stockApplied` true ho to dobara plus kabhi nahi (API 409).
- Reverse (admin only, confirm dialog + reason): stock minus, `stockApplied: false`, `stock_movements: lot_reversed`, event `reversed`.
- Inventory page par product row/detail mein "last stock from LOT-xxxx" reference (stock_movements se).
- Agar D1 = (a) chuna gaya: size-wise plus; (b) chuna gaya: total plus, size breakdown sirf lot mein.

Done ka matlab: Ready par stock khud barhta hai, dobara dabane par nahi, reverse par wapas aata hai, sab history mein.

---

### Phase 4 — Module 4: Loose Items & B-Pair register

Deliverables:
- `/ledger` page (admin): entry form (type chips B-pair/Accessory/Fabric, item, qty+unit, note, optional lot link), table with type filter + search, edit/delete with history.
- API: `GET/POST /api/ledger`, `PUT/DELETE /api/ledger/:id`.
- Lot detail se shortcut: "Farq ke N pieces B-pair mein darj karein" (prefilled form).
- Print/export (CSV + print CSS pattern reuse).
- **Koi link stock se nahi** — code mein yeh guarantee (ledger kabhi `products` ko touch nahi karta).

Done ka matlab: register chal raha hai, lot ke farq se ek click mein entry, stock par zero asar.

---

### Phase 5 — Polish, reports, training, handover

- Dashboard: production widget (naye / process / aaj ready + pcs), analytics mein "stock from production" line (optional).
- Responsive pass (Rules.md §7.1) saare naye pages par, phone/tablet screenshots.
- Rules.md + README final; `docs/` mein cutting master aur admin ke liye 1-page "kaise chalayein".
- Test lot end-to-end (asal data), client training, pehle hafte support.

---

## 4. Priority ka khulasa

```text
P0  Phase 0  Roles + data model          (buniyad; bina is ke kuch nahi)
P1  Phase 1  Cutting Portal              (client ka pehla visible module)
P2  Phase 2  Operations pipeline         (admin ka control)
P3  Phase 3  Auto inventory sync         (asal faida; stock ko chhoota hai is liye pipeline ke baad)
P4  Phase 4  Ledger / B-pair             (independent, chhota; chahein to Phase 2 ke parallel bhi ho sakta hai)
P5  Phase 5  Polish + training
```

Relative size: Phase 0 = M, Phase 1 = M, Phase 2 = L, Phase 3 = M (risk high), Phase 4 = S, Phase 5 = S/M.

---

## 5. Risks aur unka ilaaj

| Risk | Ilaaj |
|------|-------|
| Sizes ka model (D1) baad mein badalna | Phase 0 mein decide; lot schema dono cases support kare (`sizes[]` hamesha store) |
| Stock double plus | `stockApplied` flag + transaction + unique lot number |
| Cutting master ko kuch aur dikh jana | Proxy par path-level guard + har API route par role check (dono) |
| Purane sales/purchases `stock_movements` mein nahi | Phase 3 sirf lots ke liye log kare; sales/purchases ko baad mein migrate karna optional |
| Ek lot mein kai articles | Proposal: ek lot = ek article (FAQ). UI yahi enforce kare |

---

## 6. Status

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Foundation | **Done (2026-10-20)** | Roles + JWT role, proxy guard, `route({ roles })`, Users page, product sizes end-to-end (inventory, sales, purchases), lots/lot_events schema, unit + e2e tests |
| 1 Cutting Portal | **Done (2026-10-20)** | `/cutting` (my lots), `/cutting/new`, `/cutting/:id` (+ edit), admin `/lots` + `/lots/:id`, dashboard Production widget, lot history |
| 2 Operations pipeline | **Done (2026-10-20)** | `POST /api/lots/:id/stage` (send_stitching → stitched(qty ≤ cut) → washed(qty ≤ stitched) → packing), shortfall, pipeline qty, `GET /api/lots/report` (+CSV), report page; checklist `docs/phase-2-checklist.md` |
| 3 Auto inventory sync | **Done (2026-10-20)** | `ready` action (`src/lib/production.js`): `addStock` per size inside the transaction, `stockApplied` idempotency, `readySizes`, product `lastProduction`, `stock_movements` audit, `POST /api/lots/:id/reverse` (reason required), `GET /api/stock-movements`; checklist `docs/phase-3-checklist.md` |
| 4 Ledger / B-pair | **Done (2026-10-21)** | `/ledger` (admin): entries with type chips, qty+unit, optional lot link, edit history, delete, type/period/search filters, CSV + print; `GET/POST /api/ledger`, `GET/PUT/DELETE /api/ledger/:id`; lot shortfall shortcut (`/ledger?lot=`); `ledger_entries` never touches products/stock (unit test guards the imports); checklist `docs/phase-4-checklist.md` |
| 5 Polish + training | **Done (2026-10-21)** | Dashboard widget: Cut today / Ready today / Produced this month (net from `stock_movements`); analytics "Produced (Period)"; EditProductPopup "Track stock per size" on an unsized product (split hint); responsive sweep of all production pages (390/820); `docs/guide-admin.md`, `docs/guide-cutting-master.md`, README; checklist `docs/phase-5-checklist.md`. Client training / first-week support is a human step (see checklist §6) |

Decisions taken in Phase 0/1: **D1 = (a)** sizes are a real product model (`sizes[]`, total derived); D2 any number of cutting
masters (lots filtered by `createdBy`); D3 cutting data editable only at cutting stage (owner or admin), delete admin-only at
cutting stage; D5 `LOT-1001` upwards. D4 (reverse rules) is implemented in Phase 3.

Verification: `docs/phase-1-checklist.md`. Har phase ke baad: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, responsive screenshots.

---

## 7. Client feedback (2026-10-21) aur naye phases

Client ki voice notes ka khulasa: "yeh dukaan wala setup hai"; factory mein (a) stitching workers ke **operation-wise piece rates** aur
**salary** (hafta / 15 din / mahina, advance + deduction), (b) stitching mein cutting ka **in / out (gate pass) / balance**, (c) cutting
walon ka alag chota portal (ban chuka). Operations ke rates admin khud dalta/badalta hai (e.g. 70 = 3.5 + 4 + …), operation select kar ke
bande assign karta hai, system khud calculate karta hai.

| Phase | Scope | Status |
|-------|-------|--------|
| 6 Workers & Wages | `workers`, `operations` (rate per piece, editable), `work_entries` (lot + operation + worker + pieces → amount, rate snapshot), lot page "Work & wages" assign panel, `/workers` (Workers · Operations & rates), `/wages` report (this week / last week / 15 days / this month / custom, per worker, CSV, print). Leave (2026-10-22): worker `dailyRate`, leave = din × per-day salary; "Leave / Advance" popup (leave, advance, deduction, bonus) + period card; "Today" filter. **Advance khata (2026-10-24, client ka jawab)**: advance salary se khud nahi katta, worker ke khate mein jata hai; "Advance cut" (`recovery`) se jitna aur jab admin chahe katta hai (baqi se zyada nahi), baqi khud aage chalta hai; `/api/wages/advances`, Wages page par "Advance account (khata)" card (Given / Cut / Left + running balance), report mein `advanceLeft`, dashboard par "Advance left". | **Done (2026-10-22, khata 2026-10-24)** |
| 7 Gate passes | Client ke jawab (voice 3/4/6) ke mutabiq: lot par `bundleNumber` + `shrinkage` %, `send_stitching` par **stitching gate pass** (cut/lot no., bundle, sizes range + per size, pieces, shrinkage, fabric), `stitched` par **washing gate pass** (pieces + `washType`), dono par phone 0321-4361127 upar / 0323-8888000 neeche; `gate_passes` snapshot collection (GP-1001…), `GET/POST /api/lots/:id/gate-passes`, lot page card + print preview; cutting master dekh/print, admin issue/reissue. **7b (2026-10-23)**, client ki pehli voice ("3000 piece… kitni padi hui hai… jo nikalti jayegi gate pass out"): stitching se thora thora maal washing ko (`POST /api/lots/:id/dispatch`, har hissa apna partial washing gate pass, `stitchOutQty`), "padi hui" balance = cut − sent out, `/stitching` page (lots, received / sent out / lying), lot page "Gate pass out" panel, stitching band karte waqt pieces ≥ jo nikal chuke (aakhri pass sirf baqi pieces ka), dashboard "Lying in stitching". Checklist `docs/phase-7-checklist.md` | **Done (2026-10-23)** |
| 8 Factory mode | **Shuru (2026-10-23)**: Sales, Customers, Recovery filhal hidden (user ka faisla); Salesman, Analytics, Backup sirf Sales ka data dikhate the, woh bhi hidden. Ek list `src/constants/modules.js` (`HIDDEN_MODULES`): sidebar link nahi, page URL dashboard par redirect (proxy), data/API waise hi. Dashboard factory-first (Production upar, sales/recovery cards aur sales chart nahi), Quick actions: New Cutting Entry, Stitching, New Purchase. Wapas laane ke liye list se path hata dein. | **Done (2026-10-23)** |
| 9 Dashboard | User ki farmaish (2026-10-23): pro level, modern dashboard. Ek call `GET /api/dashboard` (`src/lib/dashboard.js`, rules `src/constants/dashboard.js`): greeting + quick actions (New cutting entry, Gate pass out, New purchase, Add item, Calculator), hero "Produced this month" (pichle mahine ke unhi dinon se %, 14 din sparkline), tiles (Cut today vs kal, Lots in process + 7+ din ruke, Lying in stitching, Stock alerts), Production pipeline (stage-wise lots/pieces, click → `/lots?stage=`), 14 din trend chart + table, Waiting longest, Recent activity, Stock health, Spending this month (purchasing/expenses/wages), Workers this week, Recent gate passes. Har minute khud refresh, skeleton loading, phone/tablet responsive. Sales/Recovery wapas on hon to unke cards upar khud aa jate hain. | **Done (2026-10-23)** |

Client ke saare zaroori sawal hal (2026-10-24): advance khata ki tarah (upar Phase 6). Baqi cheezen default par chal rahi hain aur sirf tab
poochni hain jab client khud kuch alag chahe: work entry admin karta hai; washing ke liye gate pass bahar jaane wala maal maan kar bana hai;
Sales user ke faisle se hidden hai.
