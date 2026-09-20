"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneDVisualMapProps {
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

const ZONE_D_SPOTS: BoothSpot[] = [
  // 1D entrance
  { num: 1,  code: "1D",  left: "24.5%", top: "84.8%", width: "2.8%", height: "3.2%" },

  // 2D to 7D (bottom horizontal row)
  { num: 2,  code: "2D",  left: "33.8%", top: "82.2%", width: "4.8%", height: "2.2%" },
  { num: 3,  code: "3D",  left: "39.8%", top: "82.2%", width: "4.8%", height: "2.2%" },
  { num: 4,  code: "4D",  left: "45.8%", top: "82.2%", width: "4.8%", height: "2.2%" },
  { num: 5,  code: "5D",  left: "51.8%", top: "82.2%", width: "4.8%", height: "2.2%" },
  { num: 6,  code: "6D",  left: "58.8%", top: "82.2%", width: "4.8%", height: "2.2%" },
  { num: 7,  code: "7D",  left: "65.8%", top: "82.2%", width: "4.8%", height: "2.2%" },

  // 8D, 9D (horizontal left yellow boxes)
  { num: 8,  code: "8D",  left: "13.5%", top: "69.5%", width: "7.0%", height: "3.5%" },
  { num: 9,  code: "9D",  left: "21.0%", top: "69.5%", width: "7.0%", height: "3.5%" },

  // 10D to 14D (vertical column along INCA & CO)
  { num: 10, code: "10D", left: "25.0%", top: "62.0%", width: "4.8%", height: "5.0%" },
  { num: 11, code: "11D", left: "25.0%", top: "56.5%", width: "4.8%", height: "5.0%" },
  { num: 12, code: "12D", left: "25.0%", top: "52.5%", width: "4.8%", height: "3.8%" },
  { num: 13, code: "13D", left: "25.0%", top: "48.8%", width: "4.8%", height: "3.8%" },
  { num: 14, code: "14D", left: "25.0%", top: "43.8%", width: "4.8%", height: "4.8%" },

  // 15D to 17D (upper vertical along CARINA)
  { num: 15, code: "15D", left: "39.0%", top: "30.5%", width: "4.8%", height: "5.0%" },
  { num: 16, code: "16D", left: "27.5%", top: "26.0%", width: "4.8%", height: "5.5%" },
  { num: 17, code: "17D", left: "27.5%", top: "21.0%", width: "4.8%", height: "5.0%" },
];

export function ZoneDVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneDVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[500px] w-auto"
          style={{ aspectRatio: "215 / 299", height: "480px" }}
        >
          <Image
            src="/image/zone-d-map.png"
            alt="Zone D Venue Map"
            fill
            sizes="(max-width: 768px) 300px, 400px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_D_SPOTS.map((spot) => {
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
                    ? "bg-amber-500 ring-2 ring-amber-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-amber-500/20 hover:bg-amber-500/60 hover:ring-1 hover:ring-amber-400 border border-amber-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-amber-600 p-0.5 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-amber-950 bg-white/95 px-0.5 rounded shadow-xs">
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
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Click directly on your booth spot on the Zone D floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-500/30 border border-amber-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-amber-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
