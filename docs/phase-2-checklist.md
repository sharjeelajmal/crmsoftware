# Phase 2 — Verification Checklist (Operations & Tracking)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Client guide (chapters, step by step, Roman Urdu): root folder ki `verification.html` browser mein kholein.

## 1. Lot pipeline (Admin → Production → Lots → lot kholein)
- [ ] Pipeline mein har step ke neeche pieces dikhte hain (Cutting = cut qty, baqi "—" jab tak entry na ho).
- [ ] Cutting stage par "Send to stitching" button; dabane par stage Stitching ho jata hai, History mein "Sent to stitching".

## 2. Stitching received
- [ ] Stitching stage par "Stitching received" panel: pieces input (default = cut qty), note optional.
- [ ] Cut se zyada pieces (e.g. cut 120, enter 121) par error; 118 enter karne par stage Washing, shortfall panel "after stitching: 2".

## 3. Washing entry (manual, simple)
- [ ] Washing stage par ek number: washed pieces (max = stitched). 119 par error, 117 par stage Packing; shortfall "after washing: 1", total 3.

## 4. Packing par agla qadam
- [ ] Packing stage par **Ready for Sale** panel (pieces + size table) dikhta hai; Edit/Delete nahi. Ready mark karna Phase 3 checklist ka hissa hai.
- [ ] Packing stage par lot delete/edit nahi ho sakta (error message).

## 5. History
- [ ] Har action History timeline mein naam, waqt aur pieces ke saath: created → sent to stitching → stitched → washed.

## 6. Cutting master
- [ ] Cutting master ke login mein lot detail read-only: pipeline aur history dikhte hain, koi stage button nahi.
- [ ] Cutting master `/api/lots/<id>/stage` ya report nahi khol sakta (403).

## 7. Lot report (Production → Lot Report)
- [ ] Filters: Today / Last 7 Days / This Year / All Time / Custom Range.
- [ ] Stat cards (Lots, Cut, Stitched, Washed) aur stage-wise table sahi; lots table mein shortfall highlighted.
- [ ] "Download CSV" se file download hoti hai jis mein Lot #, Article, Stage, Cut, Stitched, Washed, Ready, In stock, Shortfall columns hain.

## 8. Dashboard & lists
- [ ] Dashboard Production widget "In process" mein stitching/washing/packing wale lots count hote hain.
- [ ] `/lots` par stage filter (Stitching/Washing/Packing) sahi lots dikhata hai.

## 9. Responsive
- [ ] Phone (390px) par lot detail ka stage panel, shortfall panel aur report page saaf dikhte hain.
