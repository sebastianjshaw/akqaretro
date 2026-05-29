"use client";

import Image from "next/image";

/**
 * AKQA wordmark 2026. Single white-on-black asset:
 * light mode — CSS invert → black wordmark on page background;
 * dark mode — mix-blend-screen drops the black plate.
 */
export function AKQALogo() {
  return (
    <div className="akqaretro-logo flex justify-center py-6 bg-[var(--background)]">
      <a
        href="/"
        className="akqaretro-logo__link inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2"
        aria-label="AKQA – Home"
      >
        <span className="akqaretro-logo__img-wrap inline-block bg-[var(--background)]">
          <Image
            src="/akqa-wordmark-white.png"
            alt="AKQA"
            width={286}
            height={100}
            className="akqaretro-logo__img h-10 w-auto object-contain object-center invert dark:invert-0 dark:mix-blend-screen"
            priority
          />
        </span>
      </a>
    </div>
  );
}
