import type { Metadata } from "next";
import "./globals.css";
import { AKQALogo } from "@/components/retro/AKQALogo";

export const metadata: Metadata = {
  title: "Retrospective | AKQA",
  description: "Agile retrospective board – Positive, Negative, Actions",
  robots: { index: false, follow: false, noarchive: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a href="#akqaretro-main" className="akqaretro-skip-link fixed left-[-9999px] top-4 z-[100] bg-[var(--akqa-dove)] text-[var(--akqa-white)] px-4 py-2 text-sm focus:left-4 focus:top-4">
          Skip to content
        </a>
        <AKQALogo />
        <main id="akqaretro-main">{children}</main>
      </body>
    </html>
  );
}
