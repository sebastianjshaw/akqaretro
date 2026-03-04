import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AKQALogo } from "@/components/retro/AKQALogo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Retrospective | AKQA",
  description: "Agile retrospective board – Positive, Negative, Actions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <a href="#akqaretro-main" className="akqaretro-skip-link fixed left-[-9999px] top-4 z-[100] bg-[var(--akqa-dove)] text-[var(--akqa-white)] px-4 py-2 text-sm focus:left-4 focus:top-4">
          Skip to content
        </a>
        <AKQALogo />
        <p className="akqaretro-prime-directive text-center text-sm text-[var(--akqa-muted)] px-4 pt-2 pb-4 max-w-2xl mx-auto italic">
          Regardless of what we discover, we understand and truly believe that everyone did the best job they could, given what they knew at the time, their skills and abilities, the resources available, and the situation at hand.
        </p>
        <main id="akqaretro-main">{children}</main>
      </body>
    </html>
  );
}
