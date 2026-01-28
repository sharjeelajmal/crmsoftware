import { Montserrat, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-noto-nastaliq-urdu",
});

export const metadata = {
  title: "Mr.Denum CRM",
  description: "Admin Portal for Mr.Denum",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
       <body className={`${montserrat.variable} ${notoNastaliqUrdu.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}