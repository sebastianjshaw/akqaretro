"use client";

import Image from "next/image";

/**
 * AKQA wordmark for centre-top placement.
 */
export function AKQALogo() {
  return (
    <div className="akqaretro-logo flex justify-center py-6">
      <a
        href="/"
        className="akqaretro-logo__link inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2"
        aria-label="AKQA – Home"
      >
        <Image
          src="/akqa.png"
          alt="AKQA"
          width={120}
          height={32}
          className="akqaretro-logo__img h-8 w-auto object-contain invert dark:invert-0"
          priority
        />
      </a>
    </div>
  );
}
