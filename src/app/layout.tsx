import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getShopSettings } from "@/lib/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Consignment Shop",
    template: "%s | Consignment Shop",
  },
  description:
    "Browse consignment items, claim or bid on what you love, and check out online. Simple shopping for everyone.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getShopSettings();

  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <SiteHeader shopName={settings.shopName} />
          <main className="flex-1 px-0 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:py-5 md:pb-8">
            {children}
          </main>
          <MobileBottomNav />
          <SiteFooter shopName={settings.shopName} />
        </Providers>
      </body>
    </html>
  );
}
