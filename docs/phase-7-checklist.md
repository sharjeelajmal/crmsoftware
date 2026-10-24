# Phase 7 — Verification Checklist (Gate Passes)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Interactive version: root folder ki `verification.html` (Phase 7 tab).

## 1. Cutting entry (cutting master ya admin → New Cutting)
- [ ] Fabric section mein do naye fields: **Bundle number** aur **Shrinkage %** (0–100). Dono optional.
- [ ] Lot page par "Bundle no. / Shrinkage / Wash" dikhte hain; Edit (cutting stage par) se badal sakte hain.

## 2. Stitching gate pass (Admin → Lots → lot → "Send to stitching")
- [ ] Send to stitching dabate hi "Gate passes" card mein **GP-1001 · Stitching gate pass** aa jata hai.
- [ ] Print par: upar **0321-4361127**, AJ Garments, "STITCHING GATE PASS", No. + date, Cut/Lot no., Article, Bundle no., Sizes (range e.g. 30 – 36), Total pieces, Shrinkage %, Fabric, size-wise table, Issued by / Received by, neeche **0323-8888000**.
- [ ] Print preview mein sirf gate pass aata hai (sidebar/buttons nahi).

## 3. Washing gate pass ("Stitching received")
- [ ] Stitching received form mein **Wash type** field (e.g. Enzyme wash). Save par **GP-1002 · Washing gate pass**: Lot no., Article, Pieces (= stitched pieces), Wash, line "118 pieces of LOT-xxxx sent for Enzyme wash".
- [ ] Wash type lot page par "Wash" ke neeche dikhta hai.

## 4. Reissue / purane lots
- [ ] Jis lot ka pass nahi (Phase 7 se pehle ka) us par "Issue stitching gate pass" / "Issue washing gate pass" button (sirf admin); naya number milta hai. Cutting stage ke lot par stitching pass issue nahi hota (409).
- [ ] Cutting master apne lot ke passes dekh aur print kar sakta hai, issue nahi; doosre ka lot 403.

## 4b. Stitching se thora thora maal (Phase 7b)
- [ ] Production → **Stitching** page: cards Lots in stitching / Received / Sent out / **Lying (padi hui)**, har lot ki row mein received, sent out, lying aur bar.
- [ ] Row (ya lot page) par **Gate pass out** → pieces (default: jitne pade hain), wash type → "Issue gate pass" → naya washing pass (sirf in pieces ka) print ke liye khulta hai.
- [ ] Lying itne kam ho jate hain; pade huay se zyada pieces bhejne par error; history mein "Gate pass out to washing".
- [ ] Stitching band karna ("Stitching received"): jitne nikal chuke us se kam pieces par button band; aakhri washing pass sirf baqi pieces ka (sab nikal chuke hon to koi pass nahi).
- [ ] Dashboard Production widget: "Lying in stitching" pieces aur lots.

## 5. Snapshot
- [ ] Pass issue hone ke baad lot edit karne se purane pass ke numbers nahi badalte (pass us waqt ki copy hai).

## 6. Responsive
- [ ] Phone (390px) par gate pass preview scroll ke saath saaf, print button neeche; cutting form ke naye fields 2 columns mein.
