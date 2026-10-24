# Phase 6 — Verification Checklist (Workers & Wages)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Client guide (chapters, step by step, Roman Urdu): root folder ki `verification.html` browser mein kholein.

## 1. Operations & rates (Admin → Production → Workers → "Operations & rates")
- [ ] "Add Operation": naam + rate per piece (e.g. Belt 3.5, Pocket 4, Side seam 62.5). Card "Labour per piece" = sab rates ka sum (70).
- [ ] Rate edit karne par note: purani entries ka rate nahi badalta. Deactivate (eye icon) → nayi assignment mein nahi dikhta.
- [ ] Jo operation kisi entry mein use ho chuka ho uska delete 409 (message: inactive karein).

## 2. Workers
- [ ] "Add Worker": naam, phone, per-day salary (chhutti ki kataui ke liye; piece-rate worker ke liye khali), type, note. Duplicate naam par error.
- [ ] Deactivate → row grey, assignment dropdown mein nahi aata. Delete sirf jab koi work entry na ho.

## 3. Lot par kaam assign karna (Admin → Lots → lot → "Work & wages")
- [ ] "Assign work": operation chunein → rate khud bhar jata hai (is assignment ke liye badal sakte hain).
- [ ] Workers rows: "Add worker", "Split N evenly" se pieces barabar bat jate hain; same worker do dafa nahi; pieces 0 par save nahi.
- [ ] Neeche live total: pieces × rate. Save par entries operation-wise group mein, lot ka total labour aur per-piece labour.
- [ ] Entry remove (trash) → confirm → wages se nikal jati hai.

## 4. Wages report (Admin → Production → Wages)
- [ ] Period pills: Today, This Week (Mon–Sun), Last Week, 15 Days, This Month, Custom. Cards: Workers paid, Pieces, Wages, Net payable.
- [ ] Har worker ki row: entries, pieces, net; click par us ki entries (operation, lot, pieces × rate, amount).
- [ ] Worker filter dropdown; CSV download (Worker, Entries, Pieces, Wages, Bonus, Leave days, Leave cut, Advance given, Advance cut, Advance left (today), Deduction, Net payable); Print sirf report.
- [ ] "Leave / Advance" button: Leave chunein, worker chunein (per-day salary khud bharti hai), din (aadha din bhi) → kataui = din × per-day salary.
- [ ] Worker ki row mein "− leave X (N days)" aur net payable kam; neeche "Leave, advance & deductions" card mein entry, delete ke saath.
- [ ] Deduction / Bonus bhi isi popup se: deduction net se minus, bonus plus. "Today" filter se roz ka hisaab.
- [ ] **Advance khata** (client, 2026-10-24): Advance dene se salary nahi katti, woh worker ke khate mein jata hai. Salary se sirf "Advance cut" se katta hai, jitna aur jab admin chahe (8 din, 10 din, mahina); baqi khud aage chalta hai.
      Cut khate ke baqi se zyada nahi ho sakta (laal error); khata card: Given / Cut / Left + har entry ke baad baqi; jis advance ka hissa kat chuka woh pehle cut delete kiye baghair delete nahi hota.

## 5. Guards
- [ ] Cutting master ko Workers/Wages links nahi; API 403.
- [ ] Wages ka stock/products se koi link nahi (Inventory same rehti hai).

## 6. Responsive
- [ ] Phone (390px) par Workers, Operations, Assign work modal, Wages rows card-style, koi horizontal scroll nahi.
