# Phase 3 — Verification Checklist (Automated Inventory Sync)

Pehle `npm run dev`, browser hard refresh. Automated: `npm test`, `npm run test:e2e`, `npm run lint`, `npm run build` sab pass.
Client guide (chapters, step by step, Roman Urdu): root folder ki `verification.html` browser mein kholein.

## 1. Ready for Sale (Admin → Lots → packing stage ka lot)
- [ ] Panel "Mark Ready for Sale": pieces (default = washed), per-size table khud proportional bhar jati hai, total = pieces.
- [ ] Sizes ka total pieces se alag ho to error; washed se zyada pieces par error.
- [ ] Confirm dialog "Add to stock?" ke baad: stage Ready, toast "+N pieces added to stock", History mein "Ready for sale — stock added (+N)".

## 2. Stock khud plus
- [ ] Inventory mein us product ka Remaining +N aur har size ka stock usi breakdown se barha.
- [ ] Product row par chip "LOT-1001 · +N" (click → lot page).
- [ ] Stock history (product par icon) mein lot ke saath + entries, kis ne, kab.

## 3. Ek lot sirf ek dafa
- [ ] Ready lot par dobara Ready ka koi button nahi; API par dobara call 409.

## 4. Reverse (sirf Admin)
- [ ] Ready lot par "Reverse" → reason lazmi → confirm: stock wapas minus (total aur sizes), lot wapas Packing, History mein "Ready reversed" reason ke saath.
- [ ] Stock history mein − entries reason ke saath.
- [ ] Reverse ke baad dobara Ready mark ho sakta hai.

## 5. Bina size wale product
- [ ] Unsized product ke lot par Ready: sirf total Remaining barhta hai, koi size error nahi.

## 6. Report & widget
- [ ] Lot Report mein Ready column aur "In stock" column; stage-wise table mein Ready bucket.
- [ ] Dashboard widget "Ready" count sahi.

## 7. Cutting master
- [ ] Cutting master Ready/Reverse nahi kar sakta (panel nahi; API 403).

## 8. Responsive
- [ ] Phone par Ready form (size table) aur stock history popup saaf dikhte hain.
