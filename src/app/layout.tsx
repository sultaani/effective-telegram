import type { Metadata, Viewport } from "next";
import "@fontsource-variable/figtree";
import "@fontsource-variable/vollkorn";
import "@fontsource-variable/dm-sans";
import "@fontsource/source-code-pro/400.css";
import "@fontsource/source-code-pro/600.css";
import "./globals.css";

const base = process.env.APP_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Kogi State College of Education, Ankpa", template: "%s | KSCOE Ankpa" },
  description: "Kogi State College of Education, Ankpa: programmes, admissions, news and the student and staff portals.",
  openGraph: { type: "website", siteName: "Kogi State College of Education, Ankpa", locale: "en_NG", images: ["/images/hero.jpg"] },
  alternates: { canonical: "/" },
  // The crest is the favicon: src/app/icon.png, src/app/apple-icon.png and src/app/favicon.ico are picked up automatically.
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
