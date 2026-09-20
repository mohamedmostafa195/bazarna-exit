"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneAVisualMapProps {
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

const ZONE_A_SPOTS: BoothSpot[] = [
  // 1A to 8A along parking corridor
  { num: 1,  code: "1A",  left: "3.2%",  top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 2,  code: "2A",  left: "9.2%",  top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 3,  code: "3A",  left: "15.2%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 4,  code: "4A",  left: "21.2%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 5,  code: "5A",  left: "27.2%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 6,  code: "6A",  left: "33.2%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 7,  code: "7A",  left: "39.2%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 8,  code: "8A",  left: "45.2%", top: "84.0%", width: "5.5%", height: "9.0%" },

  // 9A to 14A along Daly Dress & Nile Eyewear
  { num: 9,  code: "9A",  left: "52.0%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 10, code: "10A", left: "58.0%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 11, code: "11A", left: "64.0%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 12, code: "12A", left: "70.0%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 13, code: "13A", left: "76.0%", top: "84.0%", width: "5.5%", height: "9.0%" },
  { num: 14, code: "14A", left: "82.0%", top: "84.0%", width: "5.5%", height: "9.0%" },

  // 15A to 21A upper row
  { num: 15, code: "15A", left: "45.2%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 16, code: "16A", left: "52.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 17, code: "17A", left: "58.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 18, code: "18A", left: "64.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 19, code: "19A", left: "70.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 20, code: "20A", left: "76.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
  { num: 21, code: "21A", left: "82.0%", top: "42.0%", width: "5.5%", height: "9.0%" },
];

export function ZoneAVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneAVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[500px] w-auto"
          style={{ aspectRatio: "787 / 444", height: "360px" }}
        >
          <Image
            src="/image/zone-a-map.png"
            alt="Zone A Venue Map"
            fill
            sizes="(max-width: 768px) 450px, 600px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_A_SPOTS.map((spot) => {
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
                  <Lock className="h-2.5 w-2.5 text-zinc-300" />
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
                    ? "bg-blue-500 ring-2 ring-blue-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-blue-500/20 hover:bg-blue-500/60 hover:ring-1 hover:ring-blue-400 border border-blue-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-blue-600 p-0.5 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[8px] font-black text-blue-950 bg-white/95 px-0.5 rounded shadow-xs">
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
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Click directly on your booth spot on the Zone A floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-blue-500/30 border border-blue-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-blue-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
