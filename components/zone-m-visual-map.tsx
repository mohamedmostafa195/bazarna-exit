"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneMVisualMapProps {
  selectedBooth: string;
  occupied: string[];
  onSelect: (boothNumber: string) => void;
  disabled?: boolean;
}

interface BoothSpot {
  num: number;
  code: string;
  left: string;
  top: string;
  width: string;
  height: string;
}

const ZONE_M_SPOTS: BoothSpot[] = [
  // 1M to 3M (left bank near lake / border)
  { num: 1,  code: "1M",  left: "8.0%",  top: "92.0%", width: "7.0%", height: "3.2%" },
  { num: 2,  code: "2M",  left: "8.0%",  top: "87.0%", width: "7.0%", height: "3.2%" },
  { num: 3,  code: "3M",  left: "8.0%",  top: "82.0%", width: "7.0%", height: "3.2%" },

  // 4M to 8M (lower vertical strip along green)
  { num: 4,  code: "4M",  left: "51.0%", top: "87.5%", width: "6.5%", height: "4.2%" },
  { num: 6,  code: "6M",  left: "51.0%", top: "83.5%", width: "6.5%", height: "3.5%" },
  { num: 7,  code: "7M",  left: "51.0%", top: "79.5%", width: "6.5%", height: "3.5%" },
  { num: 8,  code: "8M",  left: "51.0%", top: "74.5%", width: "6.5%", height: "3.5%" },

  // 9M to 13M (middle vertical strip)
  { num: 9,  code: "9M",  left: "51.0%", top: "61.0%", width: "6.5%", height: "4.2%" },
  { num: 10, code: "10M", left: "51.0%", top: "56.8%", width: "6.5%", height: "3.5%" },
  { num: 11, code: "11M", left: "51.0%", top: "52.8%", width: "6.5%", height: "3.5%" },
  { num: 12, code: "12M", left: "51.0%", top: "48.8%", width: "6.5%", height: "3.5%" },
  { num: 13, code: "13M", left: "51.0%", top: "43.8%", width: "6.5%", height: "4.2%" },

  // 14M (near Kerastase)
  { num: 14, code: "14M", left: "90.0%", top: "30.5%", width: "3.5%", height: "2.8%" },

  // 15M to 18M (upper vertical strip)
  { num: 15, code: "15M", left: "89.5%", top: "17.5%", width: "5.5%", height: "1.8%" },
  { num: 16, code: "16M", left: "82.0%", top: "13.5%", width: "6.5%", height: "3.8%" },
  { num: 17, code: "17M", left: "82.0%", top: "9.5%",  width: "6.5%", height: "3.8%" },
  { num: 18, code: "18M", left: "82.0%", top: "5.5%",  width: "6.5%", height: "3.8%" },
];

export function ZoneMVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneMVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[500px] w-auto"
          style={{ aspectRatio: "179 / 439", height: "480px" }}
        >
          <Image
            src="/image/zone-m-map.png"
            alt="Zone M Modest Map"
            fill
            sizes="(max-width: 768px) 300px, 400px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_M_SPOTS.map((spot) => {
            const isTaken = occCodes.includes(spot.code);
            const isSelected = selectedBooth === String(spot.num);

            if (isTaken) {
              return (
                <div
                  key={spot.num}
                  title={`Booth ${spot.code} is occupied`}
                  style={{
                    left: spot.left,
                    top: spot.top,
                    width: spot.width,
                    height: spot.height,
                  }}
                  className="absolute z-10 flex cursor-not-allowed items-center justify-center rounded-xs bg-zinc-900/70 text-[8px] font-bold text-white shadow-xs backdrop-blur-[1px]"
                >
                  <Lock className="h-2 w-2 text-zinc-300" />
                </div>
              );
            }

            return (
              <button
                key={spot.num}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(String(spot.num))}
                title={`Select Booth ${spot.code}`}
                style={{
                  left: spot.left,
                  top: spot.top,
                  width: spot.width,
                  height: spot.height,
                }}
                className={`group absolute z-20 flex items-center justify-center rounded-xs transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? "bg-yellow-500 ring-2 ring-yellow-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-yellow-500/20 hover:bg-yellow-500/60 hover:ring-1 hover:ring-yellow-400 border border-yellow-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-yellow-600 p-0.5 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-yellow-950 bg-white/95 px-0.5 rounded shadow-xs">
                    {spot.code}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          Click directly on your booth spot on the Zone M (Modest) floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-yellow-500/30 border border-yellow-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-yellow-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
