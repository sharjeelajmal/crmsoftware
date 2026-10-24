// Brand identity — single place for name, tagline aur logo paths.
// Logo files: public/aj-logo.png (square monogram), public/aj-logo-full.png (wordmark),
// src/app/favicon.ico (generated from the same monogram). Dekhein Rules.md §4 & §7.
// public/logo.png sirf purane DB records (avatar: '/logo.png') ke liye rakha gaya hai.

export const BRAND = {
  name: "AJ Garments",
  slug: "aj-garments",
  tagline: "Style for every you",
  email: "contact@ajgarments.com",
  logo: "/aj-logo.png",
  logoFull: "/aj-logo-full.png",
};

// Business details printed on invoices. Update here only.
// TODO(client): replace with AJ Garments' own address, phones and bank accounts.
export const BUSINESS = {
  addressLines: ["Shop# 02, Noor Plaza Basement, Tire market near", "Rasheed center Landa Bazar Lahore"],
  contacts: [
    { name: "Rashid Ali", phone: "03214361127" },
    { name: "Bashir Ahmad", phone: "03217290003" },
  ],
  bankAccounts: [
    { bank: "Meezan Bank", accountName: "Muhammad Waqar", accountNumber: "02760102977856" },
    { bank: "Faisal Bank", accountName: "Muhammad Waqar", accountNumber: "3241301000004794" },
    { bank: "UBL Bank", accountName: "Muhammad Waqar", accountNumber: "1569328218288" },
    { bank: "MCB Bank", accountName: "Bashir Ahmad", accountNumber: "0000000006375057" },
  ],
  invoiceNoteUrdu: "براہ کرم اپنی سامان موقع پر تسلی سے گن کر لیں۔ " + "بعد میں ہم ذمہ دار نہ ہوں گے۔",
  // Printed on every gate pass: one number at the top, one at the bottom (client's instruction).
  gatePass: { phoneTop: "0321-4361127", phoneBottom: "0323-8888000" },
  // Pakistan Standard Time; used when bucketing sales by hour on the server.
  timezoneOffsetHours: 5,
};
