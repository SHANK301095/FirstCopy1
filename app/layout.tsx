import "./globals.css";
import type { ReactNode } from "react";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";

export const metadata = {
  title: "SeasonVille — Festival-first private label ecommerce",
  description: "SeasonVille premium festive gifting and private label ecommerce for India."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="container py-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
