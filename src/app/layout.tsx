import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rentife — Rent that collects itself",
    template: "%s · Rentife",
  },
  description:
    "Automatic M-Pesa matching, instant receipts and polite reminders for Kenyan landlords. Your money goes straight to your own Paybill.",
  applicationName: "Rentife",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Rentife — Rent that collects itself",
    description: "Rent collection, receipts, records and property operations for Kenyan landlords, agents and diaspora owners.",
    siteName: "Rentife",
    locale: "en_KE",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4a2052",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Rentife",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Rent collection, receipts, records and property operations for Kenyan landlords, agents and diaspora owners.",
  areaServed: "KE",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
