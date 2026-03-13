import type { Metadata } from "next";
import "./globals.css";
import { AKQALogo } from "@/components/retro/AKQALogo";
import { ThemeToggle } from "@/components/retro/ThemeToggle";

export const metadata: Metadata = {
  title: "Retrospective | AKQA",
  description: "Agile retrospective board – Positive, Negative, Actions",
  robots: { index: false, follow: false, noarchive: true },
};

const THEME_SCRIPT = `
(function() {
  var theme = localStorage.getItem('akqaretro-theme');
  var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="antialiased">
        <a href="#akqaretro-main" className="akqaretro-skip-link fixed left-[-9999px] top-4 z-[100] bg-[var(--akqa-dove)] text-[var(--akqa-white)] px-4 py-2 text-sm focus:left-4 focus:top-4">
          Skip to content
        </a>
        <div className="akqaretro-layout-header grid grid-cols-[1fr_auto_1fr] w-full max-w-7xl mx-auto px-4 items-center gap-4">
          <div className="akqaretro-layout-header__left min-w-0" aria-hidden />
          <div className="akqaretro-layout-header__logo flex justify-center">
            <AKQALogo />
          </div>
          <div className="akqaretro-layout-header__theme flex justify-end">
            <ThemeToggle />
          </div>
        </div>
        <main id="akqaretro-main">{children}</main>
      </body>
    </html>
  );
}
