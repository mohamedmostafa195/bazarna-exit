"use client";

import Image from "next/image";
import type { EntranceType } from "@/lib/entrance";

/** Fallback / select-entrance banner image. */
export const DASHBOARD_BANNER_IMAGE = "/image/DashboardBanner.jpg";

export const BAZARNA_BANNER_VIDEO = "/image/BazarnaBanner.mp4";
export const BAZARNA_BANNER_POSTER = "/image/DashboardBanner.jpg";

export const BYOUTH_BANNER_VIDEO = "/image/ByouthBanner.mp4";
export const BYOUTH_BANNER_POSTER = "/image/ByouthImage.jpg";

function bannerVideo(entranceType?: EntranceType | null) {
  if (entranceType === "BAZARNA") {
    return { src: BAZARNA_BANNER_VIDEO, poster: BAZARNA_BANNER_POSTER };
  }
  if (entranceType === "BYOUTH") {
    return { src: BYOUTH_BANNER_VIDEO, poster: BYOUTH_BANNER_POSTER };
  }
  return null;
}

export function DashboardBanner({
  children,
  overlay,
  entranceType,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  /** BAZARNA / BYOUTH use their own videos; otherwise the default image. */
  entranceType?: EntranceType | null;
}) {
  const video = bannerVideo(entranceType);

  return (
    <div className="relative">
      <div
        aria-hidden
        className={
          video
            ? "pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[36rem] overflow-hidden sm:mx-0 sm:h-[26rem] sm:rounded-b-[24px]"
            : "pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[28rem] overflow-hidden sm:mx-0 sm:h-80 sm:rounded-b-[24px]"
        }
      >
        {video ? (
          <video
            key={video.src}
            className="absolute inset-x-0 top-0 h-[calc(100%+125px)] w-full -translate-y-[125px] object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={video.poster}
          >
            <source src={video.src} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={DASHBOARD_BANNER_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top sm:object-center"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-b from-transparent via-zinc-50/70 to-zinc-50 dark:via-zinc-950/70 dark:to-zinc-950 sm:h-72" />
      </div>

      {overlay}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
