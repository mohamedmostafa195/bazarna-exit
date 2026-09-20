"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneYVisualMapProps {
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

// Map dimensions: 467 x 795
const ZONE_Y_SPOTS: BoothSpot[] = [];

// Booths 1Y to 36Y: Vertical column along left corridor
const startTop = 15.2;
const endTop = 91.2;
const stepY = (endTop - startTop) / 35; // ~2.17%

for (let i = 1; i <= 36; i++) {
  const topVal = startTop + (i - 1) * stepY;
  ZONE_Y_SPOTS.push({
    num: i,
    code: `${i}Y`,
    left: "27.5%",
    top: `${topVal.toFixed(2)}%`,
    width: "4.8%",
    height: "1.8%",
  });
}

// Center Island booths near S1
ZONE_Y_SPOTS.push(
  // Bottom horizontal row: 37Y, 38Y, 39Y
  { num: 37, code: "37Y", left: "47.2%", top: "49.0%", width: "2.8%", height: "1.2%" },
  { num: 38, code: "38Y", left: "50.2%", top: "49.0%", width: "2.8%", height: "1.2%" },
  { num: 39, code: "39Y", left: "53.2%", top: "49.0%", width: "2.8%", height: "1.2%" },

  // Right vertical column: 40Y, 41Y, 42Y
  { num: 40, code: "40Y", left: "57.0%", top: "47.0%", width: "1.6%", height: "1.8%" },
  { num: 41, code: "41Y", left: "57.0%", top: "45.0%", width: "1.6%", height: "1.8%" },
  { num: 42, code: "42Y", left: "57.0%", top: "43.0%", width: "1.6%", height: "1.8%" },

  // Top horizontal row: 43Y, 44Y, 45Y
  { num: 43, code: "43Y", left: "52.2%", top: "43.0%", width: "2.4%", height: "1.4%" },
  { num: 44, code: "44Y", left: "49.8%", top: "43.0%", width: "2.4%", height: "1.4%" },
  { num: 45, code: "45Y", left: "47.4%", top: "43.0%", width: "2.4%", height: "1.4%" }
);

export function ZoneYVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneYVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[520px] w-auto"
          style={{ aspectRatio: "467 / 795", height: "500px" }}
        >
          <Image
            src="/image/zone-y-map.png"
            alt="Zone Y Venue Map"
            fill
            sizes="(max-width: 768px) 350px, 450px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_Y_SPOTS.map((spot) => {
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
                    ? "bg-lime-500 ring-2 ring-lime-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-lime-500/20 hover:bg-lime-500/60 hover:ring-1 hover:ring-lime-400 border border-lime-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-lime-600 p-0.5 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-lime-950 bg-white/95 px-0.5 rounded shadow-xs">
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
          <span className="flex h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
          Click directly on your booth spot on the Zone Y (Byouth) floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-lime-500/30 border border-lime-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-lime-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
