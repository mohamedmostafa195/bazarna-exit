"use client";

import { useEffect } from "react";

/** Swap this path to change the banner image. */
export const DASHBOARD_BANNER_IMAGE = "/image/DashboardBanner.jpg";

export function DashboardBanner({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = DASHBOARD_BANNER_IMAGE;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[28rem] overflow-hidden sm:mx-0 sm:h-80 sm:rounded-b-[24px]"
      >
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat sm:bg-center"
          style={{
            backgroundImage: `url('${DASHBOARD_BANNER_IMAGE}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-transparent via-zinc-50/70 to-zinc-50 dark:via-zinc-950/70 dark:to-zinc-950 sm:h-72" />
      </div>

      {overlay}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
