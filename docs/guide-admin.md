# AJ Garments CRM — Admin ke liye 1-page guide (Production)

Login: apna admin username/password. Sidebar mein **Production** section (Lots, Lot Report, Ledger, Users) sirf admin ko dikhta hai.

## Roz ka kaam (5 minute)

1. **Dashboard → Production widget**: New lots (cutting par), In process, Cut today, Ready today, Produced this month.
2. **Lots** page: stage filter (Cutting / Stitching / Washing / Packing / Ready) se dekhein kaun sa lot kahan hai.
3. Jo lot aage barha ho usay kholein aur **Next step** panel se entry karein:
   - **Send to stitching** → lot stitching par.
   - **Stitching received** → wapas aaye pieces (cut se zyada nahi ho sakte); kam hon to note likhein.
   - **Washing entry** → washed pieces (stitched se zyada nahi).
   - **Mark Ready for Sale** (packing par) → finished pieces + size-wise split → confirm → **stock khud plus** ho jata hai.
4. **Gate pass**: "Send to stitching" par stitching gate pass (GP-1001…) khud ban jata hai; "Stitching received" mein Wash type likhein to washing gate pass banta hai. Lot page ke "Gate passes" card se Print karein; purane lot par "Issue …" se naya pass.
5. **Stitching (thora thora maal):** Production → Stitching par har lot ke Received / Sent out / Lying (padi hui) pieces. Jaise jaise maal taiyar ho, "Gate pass out" se utne pieces washing ko bhejein — har dafa apna gate pass. Aakhir mein lot page par "Stitching received" se kul pieces likh kar band karein; baqi pieces ka aakhri pass khud banta hai.
6. **Shortfall** panel har stage ka farq dikhata hai. "Record N pcs as B-pair" se woh pieces **Ledger** mein darj karein.

## Workers ki salary (piece rate)

1. **Workers → Operations & rates**: har stitching operation ka naam aur rate per piece (e.g. Belt 3.5, Pocket 4 …). Card "Labour per piece" sab ka sum dikhata hai.
2. **Workers** tab mein karigar add karein (naam, phone).
3. Lot page par **Work & wages → Assign work**: operation chunein (rate khud aata hai), workers aur pieces ("Split evenly" se barabar), save.
4. **Wages** page: hafta / 15 din / mahina chunein, har worker ka net dikhta hai, row click par tafseel, CSV ya Print.
5. Rate badalne par purani entries nahi badaltin; ghalat entry ho to lot page se remove karein.
6. **Chhutti:** Workers mein har worker ki per-day salary likhein. Wages → "Leave / Advance" → Leave → worker → kitne din (aadha din bhi) → Save. Kataui = din × per-day salary, net payable se minus.
7. **Advance (khata):** "Leave / Advance" → Advance → worker → raqam → Save. Advance dene se salary **nahi** katti; woh worker ke khate mein
   jama hota hai (Wages page par "Advance account (khata)"). Jab katna ho (8 din, 10 din, mahine baad), khate mein worker ka **Cut** dabayein
   (ya popup mein "Advance cut") aur jitna is salary se katna hai likhein. Baqi khata khud aage chalta hai; "Cut all" poora baqi kaat deta hai.
   Khate mein worker par click karein to har entry aur us ke baad ka baqi dikhta hai.
8. **Deduction / Bonus** bhi isi popup se: deduction salary se minus, bonus plus.

## Stock ke baare mein (zaroori)

- Stock sirf **Ready for Sale** se barhta hai, ek lot ek hi dafa. Dobara Ready ka button nahi aata.
- Ghalti ho jaye to Ready lot par **Reverse (take stock back)** → reason lazmi → stock wapas minus, lot wapas Packing.
- Inventory mein product row par chip **LOT-xxxx · +N** aur history icon se poora record (kis ne, kab, kitne, kis size mein).
- **Ledger** (Loose Items & B-Pair) ka stock se koi link nahi: wahan jo marzi likhein, Inventory nahi badalti.

## Users

- **Users** page se cutting master banayein (role: Cutting Master). Woh sirf apna cutting portal dekhta hai.
- Password reset bhi yahin se; apne aap ko deactivate/delete nahi kar sakte; aakhri admin delete nahi hota.

## Reports

- **Lot Report**: period filter (Today / Last 7 Days / This Year / All Time / Custom), stage-wise totals, har lot ka Cut / Stitched / Washed / Ready / Shortfall, CSV download.
- **Ledger**: type aur period filter, search, CSV, Print.
- **Analytics**: "Produced (Period)" card = us period mein production se stock mein aaye net pieces.

## Agar kuch ghalat ho

| Masla | Hal |
|---|---|
| Lot ki cutting ghalat hai | Sirf **Cutting** stage par Edit ho sakta hai (cutting master ya admin). Aage barh gaya ho to note mein likhein. |
| Lot delete karna hai | Sirf admin, sirf Cutting stage par. |
| Stock ghalat plus ho gaya | Ready lot par Reverse (reason ke saath), phir sahi pieces se dobara Ready. |
| Product delete nahi ho raha | Us product ka koi lot production mein hai; pehle lot Ready karein ya cutting par delete karein. |
| Purane product ko sizes dene hain | Inventory → Edit → "Track stock per size" on → maujooda stock sizes mein baantein → Save. |

Pehle hafte: ek asal lot cutting se ready tak chala kar Inventory, Lot Report aur Ledger milayein. Masla ho to `verification.html` ki checklist se step dohrayein.
