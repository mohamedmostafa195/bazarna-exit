"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ENTRANCE_COOKIE,
  isEntranceType,
  type EntranceType,
} from "@/lib/entrance";

/** Fallback / select-entrance banner image. */
export const DASHBOARD_BANNER_IMAGE = "/image/DashboardBanner.jpg";

export const BAZARNA_BANNER_VIDEO =
  "https://pub-c1e2cd0f5a51401993056e38c1816f26.r2.dev/Every%20color%2C%20every%20zipper%2C%20every%20detail%20is%20part%20of%20the%20story.Get%20a%20first%20look%20at%20the%20categories%20.mp4";
export const BAZARNA_BANNER_POSTER = "/image/DashboardBanner.jpg";

export const BYOUTH_BANNER_VIDEO =
  "https://pub-c1e2cd0f5a51401993056e38c1816f26.r2.dev/if%20you%E2%80%99ve%20been%20saving%20outfits%2C%20trends%2C%20and%20pieces%20all%20over%20your%20feed%E2%80%A6%20this%20is%20where%20they%20actuall.mp4";
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

function readEntranceCookie(): EntranceType | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${ENTRANCE_COOKIE}=([^;]+)`)
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isEntranceType(value) ? value : null;
}

export function DashboardBanner({
  children,
  overlay,
  entranceType,
}: {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  /** BAZARNA / BYOUTH use R2 videos; otherwise the default image. */
  entranceType?: EntranceType | null;
}) {
  const [cookieEntrance, setCookieEntrance] = useState<EntranceType | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setCookieEntrance(readEntranceCookie());
  }, []);

  const resolvedEntrance = entranceType ?? cookieEntrance;
  const video = bannerVideo(resolvedEntrance);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video) return;
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    const play = () => {
      void el.play().catch(() => {});
    };
    play();
    el.addEventListener("loadeddata", play);
    return () => el.removeEventListener("loadeddata", play);
  }, [video?.src]);

  return (
    <div className="relative">
      <div
        aria-hidden
        className={
          video
            ? "pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[36rem] overflow-hidden sm:left-1/2 sm:right-auto sm:mx-0 sm:h-[28rem] sm:w-screen sm:-translate-x-1/2 sm:rounded-none"
            : "pointer-events-none absolute inset-x-0 top-0 -mx-4 h-[28rem] overflow-hidden sm:mx-0 sm:h-80 sm:rounded-b-[24px]"
        }
      >
        {video ? (
          <video
            key={video.src}
            ref={videoRef}
            className="absolute inset-x-0 top-0 h-[calc(100%+125px)] w-full -translate-y-[125px] object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-zinc-50/50 to-zinc-50 dark:via-zinc-950/50 dark:to-zinc-950 sm:h-40" />
      </div>

      {overlay}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
