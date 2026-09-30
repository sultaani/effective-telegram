import { SiteFooter, SiteHeader } from "../../components/SiteChrome";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="public">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
