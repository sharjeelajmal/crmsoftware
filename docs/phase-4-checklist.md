# Phase 4 — Verification Checklist (Loose Items & B-Pair Register)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Client guide (chapters, step by step, Roman Urdu): root folder ki `verification.html` browser mein kholein.

## 1. Register page (Admin → Production → Ledger)
- [ ] Sidebar mein "Ledger" link; page par 4 cards: B-Pair pieces, Accessories, Fabric, Entries.
- [ ] "New Entry": type chips (B-Pair / Accessory / Fabric), item, quantity + unit, optional lot, note.
- [ ] Type badalne par unit khud badalti hai (Fabric → m); khali item ya 0 quantity par save nahi hota.
- [ ] Save ke baad row list mein (badge, item, qty unit, date, kis ne); toast "Entry recorded".

## 2. Lot se shortcut
- [ ] Shortfall wale lot (Admin → Lots → lot) ke Shortfall panel mein button "Record N pcs as B-pair".
- [ ] Click → Ledger page par form khula hua, B-Pair, item = article, qty = shortfall, lot linked, note "Shortfall of LOT-xxxx".
- [ ] Save ke baad row par LOT number (click → lot page). Refresh par form dobara nahi khulta.

## 3. Edit / delete with history
- [ ] Pencil → qty/note badal kar save: row update, "edited ×1".
- [ ] History icon → "Recorded" + har "Edited" entry (kis ne, kab, field: purana → naya).
- [ ] Delete → confirm → row ghayab; toast "Entry deleted".

## 4. Filters, search, export
- [ ] Type chips (All / B-Pair / Accessory / Fabric) aur period pills (Today / Last 7 Days / This Year / All Time / Custom) list aur cards dono badalte hain.
- [ ] Search item, note ya LOT number par instantly filter karta hai (bina reload).
- [ ] "Download CSV": columns Date, Type, Item, Qty, Unit, Lot #, Note, Recorded by, Edits.
- [ ] "Print": sirf register (heading + rows) print hota hai, sidebar/buttons nahi.

## 5. Stock se koi link nahi (sab se zaroori)
- [ ] Entry add / edit / delete ke baad Inventory mein us product ka Remaining bilkul same.
- [ ] Product ki stock history mein register ki koi entry nahi.
- [ ] (Automated) `tests/unit/ledger.test.js` fail hota hai agar ledger code products/stock ko chhoo le.

## 6. Cutting master
- [ ] Cutting master ko Ledger link nahi; `/ledger` kholne par wapas `/cutting`; API 403.

## 7. Responsive
- [ ] Phone (390px) par cards ek column, buttons full-width, chips wrap, rows card-style, form scroll ke sath saaf.
