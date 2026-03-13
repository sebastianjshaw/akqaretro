"use client";

import Image from "next/image";

/**
 * AKQA wordmark 2026. Light: black wordmark (multiply so white bg drops out). Dark: white wordmark (screen so black drops out).
 */
export function AKQALogo() {
  return (
    <div className="akqaretro-logo flex justify-center py-6 bg-[var(--background)]">
      <a
        href="/"
        className="akqaretro-logo__link inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2"
        aria-label="AKQA – Home"
      >
        <span className="akqaretro-logo__img-wrap inline-block bg-white dark:hidden overflow-hidden">
          <Image
            src="/akqa-wordmark-black.png"
            alt="AKQA"
            width={160}
            height={40}
            className="akqaretro-logo__img h-10 w-auto object-contain object-center mix-blend-multiply"
            priority
          />
        </span>
        <span className="akqaretro-logo__img-wrap hidden dark:inline-block bg-[var(--background)]">
          <Image
            src="/akqa-wordmark-white.png"
            alt="AKQA"
            width={160}
            height={40}
            className="akqaretro-logo__img h-10 w-auto object-contain mix-blend-screen"
            priority
          />
        </span>
      </a>
    </div>
  );
}
