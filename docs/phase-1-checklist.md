# Phase 1 — Verification Checklist (aap khud check karein)

Har heading ek cheez hai jo Phase 1 mein bani. Neeche short steps hain jin se aap 1–2 minute mein verify kar sakte hain.
Pehle `npm run dev` chala lein aur browser mein hard refresh (Ctrl+Shift+R) kar lein.

Automated: `npm test` (unit), `npm run test:e2e` (alag test DB par poora flow), `npm run lint`, `npm run build` — sab pass hone chahiye.

---

## 1. Roles & login
- [ ] Apne purane admin credentials (.env wale) se login hota hai, dashboard khulta hai, header mein "Administrator" likha hai.
- [ ] Sidebar mein neeche "Production" section hai: **Lots** aur **Users**.

## 2. Users page (Admin → Users)
- [ ] "Add User" se naya user banta hai: naam, email, password, role = Cutting Master.
- [ ] Wahi naam dobara add karne par error aata hai ("already exists").
- [ ] Apne aap ko deactivate/delete karne par error aata hai (self-protection).
- [ ] Reset password aur Edit (role/active) kaam karte hain.

## 3. Cutting master ka alag portal
- [ ] Logout kar ke naye cutting master se login karein: seedha **/cutting** (My Lots) khulta hai.
- [ ] Sidebar mein sirf: My Lots, New Cutting, Profile, Log Out.
- [ ] URL mein `/sales`, `/inventory`, `/users` type karne par wapas `/cutting` par bhej deta hai (kuch dikhta nahi).

## 4. Cutting entry (New Cutting)
- [ ] Article dropdown mein dukaan ke products aate hain.
- [ ] Kapra (naam, miqdar, unit), sizes rows (size + pieces), "Total pieces" khud jurta hai.
- [ ] Save par "LOT-1001" (ya agla number) ban kar detail page khulta hai; History mein "Cutting entry saved".
- [ ] Bina product / bina pieces save karne par error message aata hai.
- [ ] Detail page par **Edit** (sirf jab stage Cutting ho) se sizes badal kar save; History mein "edited" entry.

## 5. Admin ko lots dikhte hain
- [ ] Admin login → Dashboard par "Production" widget: New lots / In process / Ready / Today pieces sahi ginti.
- [ ] Production → Lots: cutting master ka lot list mein, stage filter aur search kaam karte hain.
- [ ] Lot detail par admin "Delete lot" sirf Cutting stage par kar sakta hai.

## 6. Product sizes (Inventory)
- [ ] Add Product mein "Track sizes" on karein → size rows (30/32/34/36) + qty; total khud banta hai.
- [ ] Product row par size chips dikhte hain (e.g. 30 · 12, 32 · 8).
- [ ] +/- stock par size chunna parta hai; total aur us size dono update hote hain.
- [ ] Edit (pencil) se naam/prices/sizes badalte hain.
- [ ] Jis product ke lots production mein hon, usay delete karne par error.

## 7. Sales & purchases with sizes
- [ ] New Sale: sized product chunne par row mein size select aata hai (stock ke saath); bina size save nahi hota.
- [ ] Sale save ke baad Inventory mein us size ka stock kam; sale delete par wapas.
- [ ] New Purchase: sized product par size lazmi; stock aur size dono barhte hain.

## 8. Profile (dono roles)
- [ ] Profile page par apna naam/email/phone edit hota hai; role sirf dikhta hai (badal nahi sakta).
- [ ] Change password kaam karta hai; cutting master apna password badal sakta hai.

## 9. Responsive
- [ ] Phone size (browser DevTools → 390px) par Users, Lots, Cutting form aur detail pages saaf dikhte hain, horizontal scroll nahi.

## 10. Purana sab kuch pehle jaisa
- [ ] Sales, Customers, Analytics, Recovery, Backup, Expenses pehle ki tarah chalte hain.
- [ ] Bina size wale purane products pehle jaisa behave karte hain (koi size select nahi poochta).
