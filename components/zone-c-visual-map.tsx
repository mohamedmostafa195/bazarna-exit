"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { normalizeBoothCode } from "@/lib/booth-validation";

interface ZoneCVisualMapProps {
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

const ZONE_C_SPOTS: BoothSpot[] = [
  // 1C, 2C (vertical near Salem)
  { num: 1,  code: "1C",  left: "50.8%", top: "76.5%", width: "4.8%", height: "4.2%" },
  { num: 2,  code: "2C",  left: "50.8%", top: "71.5%", width: "4.8%", height: "4.2%" },

  // 3C to 7C (horizontal bottom wall)
  { num: 3,  code: "3C",  left: "9.5%",  top: "47.0%", width: "6.0%", height: "3.2%" },
  { num: 4,  code: "4C",  left: "16.0%", top: "47.0%", width: "6.0%", height: "3.2%" },
  { num: 5,  code: "5C",  left: "23.0%", top: "47.0%", width: "5.5%", height: "3.2%" },
  { num: 6,  code: "6C",  left: "29.0%", top: "47.0%", width: "4.8%", height: "3.2%" },
  { num: 7,  code: "7C",  left: "34.0%", top: "47.0%", width: "6.0%", height: "3.2%" },

  // 8C to 12C (vertical middle wall)
  { num: 8,  code: "8C",  left: "42.2%", top: "43.5%", width: "4.8%", height: "3.5%" },
  { num: 9,  code: "9C",  left: "42.2%", top: "39.5%", width: "4.8%", height: "3.5%" },
  { num: 10, code: "10C", left: "42.2%", top: "35.8%", width: "4.8%", height: "3.5%" },
  { num: 11, code: "11C", left: "42.2%", top: "32.0%", width: "4.8%", height: "3.5%" },
  { num: 12, code: "12C", left: "42.2%", top: "28.5%", width: "4.8%", height: "3.5%" },

  // 13C, 14C (horizontal top wall)
  { num: 13, code: "13C", left: "34.8%", top: "25.5%", width: "6.2%", height: "3.0%" },
  { num: 14, code: "14C", left: "27.5%", top: "25.5%", width: "6.2%", height: "3.0%" },

  // 15C to 17C (upper left vertical)
  { num: 15, code: "15C", left: "33.0%", top: "17.2%", width: "2.2%", height: "2.5%" },
  { num: 16, code: "16C", left: "33.0%", top: "14.2%", width: "2.2%", height: "2.5%" },
  { num: 17, code: "17C", left: "33.0%", top: "11.2%", width: "2.2%", height: "2.5%" },

  // 18C to 23C (central 2x3 block)
  { num: 18, code: "18C", left: "49.0%", top: "11.8%", width: "8.0%", height: "2.6%" },
  { num: 19, code: "19C", left: "49.0%", top: "14.6%", width: "8.0%", height: "2.6%" },
  { num: 20, code: "20C", left: "49.0%", top: "17.2%", width: "8.0%", height: "2.6%" },
  { num: 21, code: "21C", left: "57.5%", top: "11.8%", width: "8.0%", height: "2.6%" },
  { num: 22, code: "22C", left: "57.5%", top: "14.6%", width: "8.0%", height: "2.6%" },
  { num: 23, code: "23C", left: "57.5%", top: "17.2%", width: "8.0%", height: "2.6%" },

  // 24C to 26C (upper right vertical)
  { num: 24, code: "24C", left: "73.5%", top: "15.5%", width: "4.8%", height: "3.5%" },
  { num: 25, code: "25C", left: "73.5%", top: "11.5%", width: "4.8%", height: "3.5%" },
  { num: 26, code: "26C", left: "73.5%", top: "8.0%",  width: "4.8%", height: "3.5%" },

  // 27C to 29C (top horizontal)
  { num: 27, code: "27C", left: "58.2%", top: "5.5%",  width: "6.5%", height: "2.8%" },
  { num: 28, code: "28C", left: "50.2%", top: "5.5%",  width: "6.5%", height: "2.8%" },
  { num: 29, code: "29C", left: "42.2%", top: "5.5%",  width: "6.5%", height: "2.8%" },
];

export function ZoneCVisualMap({
  selectedBooth,
  occupied,
  onSelect,
  disabled = false,
}: ZoneCVisualMapProps) {
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-center overflow-x-auto rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="relative select-none max-h-[500px] w-auto"
          style={{ aspectRatio: "244 / 429", height: "480px" }}
        >
          <Image
            src="/image/zone-c-map.png"
            alt="Zone C Fashion Map"
            fill
            sizes="(max-width: 768px) 300px, 400px"
            className="rounded-xl object-contain pointer-events-none"
            priority
          />

          {ZONE_C_SPOTS.map((spot) => {
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
                    ? "bg-rose-500 ring-2 ring-rose-400 ring-offset-1 shadow-lg scale-125 z-30"
                    : "bg-rose-500/20 hover:bg-rose-500/60 hover:ring-1 hover:ring-rose-400 border border-rose-500/40"
                }`}
              >
                {isSelected ? (
                  <span className="flex items-center justify-center rounded bg-rose-600 p-0.5 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-rose-950 bg-white/95 px-0.5 rounded shadow-xs">
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
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          Click directly on your booth spot on the Zone C (Fashion) floorplan
        </span>
        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500/30 border border-rose-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-zinc-800 text-white flex items-center justify-center text-[7px]">🔒</span> Occupied
          </span>
        </div>
      </div>
    </div>
  );
}
