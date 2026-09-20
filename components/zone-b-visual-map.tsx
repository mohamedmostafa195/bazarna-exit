"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneBVisualMapProps {
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

const ZONE_B_SPOTS: BoothSpot[] = [
  // 1B to 13B column
  { num: 1,  code: "1B",  left: "63.0%", top: "87.5%", width: "8.5%", height: "2.3%" },
  { num: 2,  code: "2B",  left: "63.0%", top: "85.0%", width: "8.5%", height: "2.3%" },
  { num: 3,  code: "3B",  left: "63.0%", top: "82.5%", width: "8.5%", height: "2.3%" },
  { num: 4,  code: "4B",  left: "63.0%", top: "80.0%", width: "8.5%", height: "2.3%" },
  { num: 5,  code: "5B",  left: "63.0%", top: "77.5%", width: "8.5%", height: "2.3%" },
  { num: 6,  code: "6B",  left: "63.0%", top: "75.0%", width: "8.5%", height: "2.3%" },
  { num: 7,  code: "7B",  left: "63.0%", top: "72.5%", width: "8.5%", height: "2.3%" },
  { num: 8,  code: "8B",  left: "63.0%", top: "70.0%", width: "8.5%", height: "2.3%" },
  { num: 9,  code: "9B",  left: "63.0%", top: "67.5%", width: "8.5%", height: "2.3%" },
  { num: 10, code: "10B", left: "63.0%", top: "65.0%", width: "8.5%", height: "2.3%" },
  { num: 11, code: "11B", left: "63.0%", top: "62.5%", width: "8.5%", height: "2.3%" },
  { num: 12, code: "12B", left: "63.0%", top: "60.0%", width: "8.5%", height: "2.3%" },
  { num: 13, code: "13B", left: "63.0%", top: "57.5%", width: "8.5%", height: "2.3%" },

  // 14B, 15B horizontal
  { num: 14, code: "14B", left: "51.0%", top: "57.0%", width: "13.0%", height: "1.8%" },
  { num: 15, code: "15B", left: "51.0%", top: "54.5%", width: "13.0%", height: "1.8%" },

  // 16B to 19B
  { num: 16, code: "16B", left: "63.0%", top: "52.0%", width: "8.5%", height: "2.0%" },
  { num: 17, code: "17B", left: "63.0%", top: "49.5%", width: "8.5%", height: "2.0%" },
  { num: 18, code: "18B", left: "63.0%", top: "47.0%", width: "8.5%", height: "2.0%" },
  { num: 19, code: "19B", left: "63.0%", top: "44.5%", width: "8.5%", height: "2.0%" },

  // 20B
  { num: 20, code: "20B", left: "93.0%", top: "49.0%", width: "7.0%", height: "1.8%" },

  // 21B, 22B diagonal
  { num: 21, code: "21B", left: "54.0%", top: "37.5%", width: "8.5%", height: "2.0%" },
  { num: 22, code: "22B", left: "51.0%", top: "35.5%", width: "8.5%", height: "2.0%" },

  // 23B, 24B
  { num: 23, code: "23B", left: "58.0%", top: "24.0%", width: "7.5%", height: "2.0%" },
  { num: 24, code: "24B", left: "57.0%", top: "22.0%", width: "7.5%", height: "2.0%" },

  // 25B, 26B, 27B, 28B, 29B curve
  { num: 25, code: "25B", left: "53.0%", top: "18.5%", width: "18.0%", height: "2.8%" },
  { num: 26, code: "26B", left: "48.0%", top: "16.0%", width: "12.0%", height: "2.5%" },
  { num: 27, code: "27B", left: "37.0%", top: "14.5%", width: "18.0%", height: "2.8%" },
  { num: 28, code: "28B", left: "27.0%", top: "15.0%", width: "11.0%", height: "2.0%" },
  { num: 29, code: "29B", left: "18.0%", top: "15.0%", width: "10.0%", height: "2.0%" },

  // 30B, 31B top boxes
  { num: 30, code: "30B", left: "14.0%", top: "9.0%", width: "19.0%", height: "3.2%" },
  { num: 31, code: "31B", left: "22.0%", top: "2.5%", width: "19.0%", height: "3.2%" },
];

export function ZoneBVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneBVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[500px] w-auto"
          style={{ aspectRatio: "194 / 589", height: "480px" }}
        >
          <Image
            src="/image/zone-b-map.png"
            alt="Zone B Venue Map"
            fill
            sizes="(max-width: 768px) 300px, 400px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_B_SPOTS.map((spot) => {
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
                    ? "bg-cyan-500 ring-2 ring-cyan-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-cyan-500/20 hover:bg-cyan-500/60 hover:ring-1 hover:ring-cyan-400 border border-cyan-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-cyan-600 p-0.5 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-cyan-950 bg-white/95 px-0.5 rounded shadow-xs">
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
          <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
          Click directly on your booth spot on the Zone B floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-cyan-500/30 border border-cyan-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-cyan-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
