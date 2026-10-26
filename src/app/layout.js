import { Montserrat, Noto_Nastaliq_Urdu } from "next/font/google";
import { BRAND } from "@/constants/brand";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { TooltipLayer } from "@/components/ui/TooltipLayer";
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
  title: `${BRAND.name} CRM`,
  description: `Admin Portal for ${BRAND.name}`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${notoNastaliqUrdu.variable} font-sans antialiased`}>
        <ToastProvider>{children}</ToastProvider>
        <TooltipLayer />
      </body>
    </html>
  );
}
