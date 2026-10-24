# Phase 5 — Verification Checklist (Polish, Reports, Handover)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Client guide (chapters, step by step, Roman Urdu): root folder ki `verification.html` browser mein kholein.

## 1. Dashboard production widget
- [ ] 6 figures: New lots, In process, Cut today (pcs + lots), Ready today (pcs + lots into stock), Produced this month (net pcs), Ready lots.
- [ ] Lot Ready mark karne par "Ready today" aur "Produced this month" barhte hain; Reverse par "Produced this month" wapas kam.
- [ ] "All lots" link → /lots.

## 2. Analytics
- [ ] "Produced (Period)" card: period filter ke mutabiq production se stock mein aaye net pieces (reverse minus).

## 3. Purane product par sizes enable karna
- [ ] Inventory → bina size wale product par Edit → "Track stock per size" toggle (current stock dikhta hai).
- [ ] Sizes mein stock baantein; neeche hint: total current stock se match (green) ya farq (orange) — total sizes ka sum ban jata hai.
- [ ] Save ke baad row par size chips; sales/purchases/lots mein size select hoti hai.
- [ ] Pehle se sized product par toggle nahi dikhta (sizes seedha edit hoti hain).

## 4. Responsive pass (naye pages)
- [ ] 390px aur 820px par: Dashboard, My Lots, New Cutting, Lot detail/edit, Lots, Lot Report, Users, Profile, Ledger, Analytics, Inventory — kahin horizontal scroll nahi, buttons full-width, tables card-style.

## 5. Docs & handover
- [ ] `docs/guide-admin.md` aur `docs/guide-cutting-master.md` (1-page, Roman Urdu) parh kar ek asal lot cutting → ready tak chalayein.
- [ ] README mein production modules, roles, tests aur docs ke links.
- [ ] `verification.html` (client guide) ke chapters app ke asal button naamon se milte hain.

## 6. Handover (aap ke haath)
- [ ] `.env` production values (MONGODB_URI, AUTH_SECRET, FIRST_USER_*), `npm run build` + `npm start` server par.
- [ ] Admin profile ka naam/email aur `BUSINESS` (address, phones, bank accounts) AJ Garments ke asal details se.
- [ ] Cutting master accounts banayein, password dein, guide print kar ke dein.
