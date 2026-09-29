import type { Metadata, Viewport } from "next";
import "@fontsource-variable/public-sans";
import "@fontsource-variable/newsreader";
import "./globals.css";

const base = process.env.APP_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: { default: "Kogi State College of Education, Ankpa", template: "%s | KSCOE Ankpa" },
  description: "Kogi State College of Education, Ankpa: programmes, admissions, news and the student and staff portals.",
  openGraph: { type: "website", siteName: "Kogi State College of Education, Ankpa", locale: "en_NG" },
  alternates: { canonical: "/" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
