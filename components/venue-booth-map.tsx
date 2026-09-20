"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Lock, LayoutGrid, Map as MapIcon, Maximize2, X, Search, Sparkles } from "lucide-react";

import { normalizeBoothCode, type ZoneConfig } from "@/lib/booth-validation";
import { ZoneAVisualMap } from "./zone-a-visual-map";
import { ZoneBVisualMap } from "./zone-b-visual-map";
import { ZoneCVisualMap } from "./zone-c-visual-map";
import { ZoneDVisualMap } from "./zone-d-visual-map";
import { ZoneMVisualMap } from "./zone-m-visual-map";
import { ZoneYVisualMap } from "./zone-y-visual-map";

export interface ZoneMeta {
  category: string;
  badgeBg: string;
  badgeText: string;
  activeTab: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  btnActiveBg: string;
}

const ZONE_METADATA: Record<string, ZoneMeta> = {
  A: {
    category: "Exclusive Talents",
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    activeTab: "bg-blue-600 text-white shadow-blue-500/20 shadow-lg",
    selectedBg: "bg-blue-600 text-white",
    selectedBorder: "border-blue-600 ring-4 ring-blue-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-blue-600 text-white shadow-xs",
  },
  B: {
    category: "Kids Wear",
    badgeBg: "bg-cyan-100 dark:bg-cyan-950/60",
    badgeText: "text-cyan-700 dark:text-cyan-300",
    activeTab: "bg-cyan-600 text-white shadow-cyan-500/20 shadow-lg",
    selectedBg: "bg-cyan-600 text-white",
    selectedBorder: "border-cyan-600 ring-4 ring-cyan-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-cyan-600 text-white shadow-xs",
  },
  C: {
    category: "Fashion Zone",
    badgeBg: "bg-rose-100 dark:bg-rose-950/60",
    badgeText: "text-rose-700 dark:text-rose-300",
    activeTab: "bg-rose-600 text-white shadow-rose-500/20 shadow-lg",
    selectedBg: "bg-rose-600 text-white",
    selectedBorder: "border-rose-600 ring-4 ring-rose-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-rose-600 text-white shadow-xs",
  },
  M: {
    category: "Modest Zone",
    badgeBg: "bg-yellow-100 dark:bg-yellow-950/60",
    badgeText: "text-yellow-800 dark:text-yellow-300",
    activeTab: "bg-yellow-600 text-white shadow-yellow-500/20 shadow-lg",
    selectedBg: "bg-yellow-600 text-white",
    selectedBorder: "border-yellow-600 ring-4 ring-yellow-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-yellow-600 text-white shadow-xs",
  },
  D: {
    category: "Modest & Accessories",
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    activeTab: "bg-amber-600 text-white shadow-amber-500/20 shadow-lg",
    selectedBg: "bg-amber-600 text-white",
    selectedBorder: "border-amber-600 ring-4 ring-amber-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-amber-600 text-white shadow-xs",
  },
  Y: {
    category: "Youth Talents",
    badgeBg: "bg-lime-100 dark:bg-lime-950/60",
    badgeText: "text-lime-800 dark:text-lime-300",
    activeTab: "bg-lime-600 text-white shadow-lime-500/20 shadow-lg",
    selectedBg: "bg-lime-600 text-white",
    selectedBorder: "border-lime-600 ring-4 ring-lime-500/20",
    selectedText: "text-white",
    btnActiveBg: "bg-lime-600 text-white shadow-xs",
  },
};

const DEFAULT_META: ZoneMeta = {
  category: "Stall Area",
  badgeBg: "bg-orange-100 dark:bg-orange-950/60",
  badgeText: "text-orange-700 dark:text-orange-300",
  activeTab: "bg-orange-600 text-white shadow-orange-500/20 shadow-lg",
  selectedBg: "bg-orange-600 text-white",
  selectedBorder: "border-orange-600 ring-4 ring-orange-500/20",
  selectedText: "text-white",
  btnActiveBg: "bg-orange-600 text-white shadow-xs",
};

export function getZoneMeta(zoneName: string): ZoneMeta {
  return ZONE_METADATA[zoneName.toUpperCase()] || DEFAULT_META;
}

interface VenueBoothMapProps {
  zones: ZoneConfig[];
  selectedZone: string;
  selectedNumber: string;
  occupied: string[];
  boothBrands?: Record<string, string>;
  onSelect: (zone: string, number: string) => void;
  disabled?: boolean;
}

export function VenueBoothMap({
  zones,
  selectedZone,
  selectedNumber,
  occupied,
  boothBrands = {},
  onSelect,
  disabled = false,
}: VenueBoothMapProps) {
  // Normalize occupied list
  const occCodes = useMemo(
    () => occupied.map((b) => normalizeBoothCode(b)).filter((b): b is string => !!b),
    [occupied]
  );

  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
  const [fullscreenMap, setFullscreenMap] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Active zone object
  const activeZoneName = selectedZone || zones[0]?.name || "A";
  const activeZoneObj = zones.find((z) => z.name === activeZoneName) || zones[0];
  const activeMeta = getZoneMeta(activeZoneName);

  // Count available booths per zone
  const zoneStats = useMemo(() => {
    return zones.map((z) => {
      let takenCount = 0;
      for (let i = 1; i <= z.limit; i++) {
        if (occCodes.includes(`${i}${z.name}`)) {
          takenCount++;
        }
      }
      const freeCount = Math.max(0, z.limit - takenCount);
      return {
        ...z,
        takenCount,
        freeCount,
        isFull: freeCount === 0 && z.limit > 0,
      };
    });
  }, [zones, occCodes]);

  const numbers = Array.from(
    { length: Math.max(0, activeZoneObj?.limit ?? 0) },
    (_, i) => i + 1
  );

  // Search filter across all zones or within active zone
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const results: { zone: string; num: number; code: string; brand: string; isTaken: boolean }[] = [];

    for (const z of zones) {
      for (let i = 1; i <= z.limit; i++) {
        const code = `${i}${z.name}`;
        const brand = boothBrands[code] || "";
        const isTaken = occCodes.includes(code);

        if (
          code.toLowerCase().includes(q) ||
          String(i).includes(q) ||
          brand.toLowerCase().includes(q)
        ) {
          results.push({ zone: z.name, num: i, code, brand, isTaken });
        }
      }
    }
    return results;
  }, [searchQuery, zones, boothBrands, occCodes]);

  const totalBrandsLoaded = Object.keys(boothBrands).length;

  return (
    <div className="space-y-4">
      {/* Search by Brand or Booth Number Box */}
      <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-xs font-black text-zinc-800 dark:text-zinc-200">
            <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
            <span>Search for your brand or booth:</span>
          </label>
          {totalBrandsLoaded > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
              ✓ {totalBrandsLoaded} brands loaded
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type brand name (e.g. Freyya, Mojo) or booth (20Y, 1A)..."
            className="h-10 w-full rounded-xl bg-zinc-100 pl-9 pr-9 text-xs font-bold text-zinc-900 outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-orange-500 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown/List */}
        {searchResults && (
          <div className="mt-2.5 max-h-52 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-800/80">
            {searchResults.length === 0 ? (
              <p className="p-3 text-center text-xs font-semibold text-zinc-400">
                No matching booth or brand found for &quot;{searchQuery}&quot;
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {searchResults.slice(0, 16).map((item) => {
                  const isSelected = selectedZone === item.zone && selectedNumber === String(item.num);
                  const meta = getZoneMeta(item.zone);

                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={item.isTaken || disabled}
                      onClick={() => {
                        onSelect(item.zone, String(item.num));
                        setSearchQuery("");
                      }}
                      className={`flex items-center justify-between rounded-lg p-2 text-left transition ${
                        item.isTaken
                          ? "cursor-not-allowed opacity-40 bg-zinc-100 dark:bg-zinc-800"
                          : isSelected
                          ? `${meta.selectedBg} ${meta.selectedText} ring-2 ring-orange-500`
                          : "bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-700 border border-zinc-200/70 dark:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-black text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                          {item.code}
                        </span>
                        <div className="truncate">
                          <p className="truncate text-xs font-bold">
                            {item.brand || `Booth ${item.code}`}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Zone {item.zone} ({meta.category.split(" ")[0]})
                          </p>
                        </div>
                      </div>

                      {item.isTaken ? (
                        <span className="shrink-0 text-[10px] font-bold text-zinc-400 uppercase">
                          Taken 🔒
                        </span>
                      ) : isSelected ? (
                        <Check className="h-4 w-4 shrink-0 stroke-[3]" />
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                          Select ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone Switcher Tabs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            1. Select Venue Zone
          </label>
          
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 bg-white p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                viewMode === "map"
                  ? activeMeta.btnActiveBg
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <MapIcon className="h-3 w-3" />
              Floor Plan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-bold transition ${
                viewMode === "grid"
                  ? activeMeta.btnActiveBg
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              Grid & Brands
            </button>
          </div>
        </div>

        {/* Zone Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {zoneStats.map((z) => {
            const isActive = activeZoneName === z.name;
            const meta = getZoneMeta(z.name);

            return (
              <button
                key={z.name}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(z.name, "");
                }}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? meta.activeTab
                    : "border border-zinc-200/80 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span>Zone {z.name}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : `${meta.badgeBg} ${meta.badgeText}`
                  }`}
                >
                  {z.isFull ? "Full" : meta.category.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Visual Floorplans for Zones */}
      {viewMode === "map" && activeZoneName === "A" ? (
        <ZoneAVisualMap
          selectedBooth={selectedZone === "A" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("A", n)}
        />
      ) : viewMode === "map" && activeZoneName === "B" ? (
        <ZoneBVisualMap
          selectedBooth={selectedZone === "B" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("B", n)}
        />
      ) : viewMode === "map" && activeZoneName === "C" ? (
        <ZoneCVisualMap
          selectedBooth={selectedZone === "C" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("C", n)}
        />
      ) : viewMode === "map" && activeZoneName === "D" ? (
        <ZoneDVisualMap
          selectedBooth={selectedZone === "D" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("D", n)}
        />
      ) : viewMode === "map" && activeZoneName === "M" ? (
        <ZoneMVisualMap
          selectedBooth={selectedZone === "M" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("M", n)}
        />
      ) : viewMode === "map" && activeZoneName === "Y" ? (
        <ZoneYVisualMap
          selectedBooth={selectedZone === "Y" ? selectedNumber : ""}
          occupied={occupied}
          disabled={disabled}
          onSelect={(n: string) => onSelect("Y", n)}
        />
      ) : (

        /* Regular / Grid View + Uploaded Map Image Banner if present */
        <div className="space-y-3">
          {activeZoneObj?.mapUrl && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-100 p-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
              <div
                onClick={() => setFullscreenMap(activeZoneObj.mapUrl!)}
                className="group relative h-48 w-full cursor-zoom-in select-none rounded-xl overflow-hidden bg-white/50 dark:bg-zinc-900/50"
              >
                <img
                  src={activeZoneObj.mapUrl}
                  alt={`Zone ${activeZoneName} Map`}
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-zinc-900/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-xs opacity-80 group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3" />
                  <span>Zoom Map</span>
                </div>
              </div>
              <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">
                🗺️ Zone {activeZoneName} Floor Plan Map — Click image to zoom, or view brands below
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 pb-2.5 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${activeMeta.badgeBg} ${activeMeta.badgeText}`}>
                  <MapPin className="h-3.5 w-3.5" />
                  Zone {activeZoneName}: {activeMeta.category}
                </span>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`h-3 w-3 rounded ${activeMeta.selectedBg}`} />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-zinc-300 opacity-60 dark:bg-zinc-700" />
                  <span>Taken</span>
                </div>
              </div>
            </div>

            {/* Booth Grid Layout with Brand Names */}
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {numbers.map((n) => {
                const boothCode = `${n}${activeZoneName}`;
                const brandName = boothBrands[boothCode] || "";
                const isTaken = occCodes.includes(boothCode);
                const isSelected =
                  selectedZone === activeZoneName && selectedNumber === String(n);

                if (isTaken) {
                  return (
                    <div
                      key={n}
                      title={`Booth ${boothCode} is occupied`}
                      className="relative flex h-16 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-100/70 p-1 opacity-40 select-none dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs font-bold line-through text-zinc-400">
                          {boothCode}
                        </span>
                      </div>
                      {brandName && (
                        <span className="truncate text-[10px] text-zinc-400 max-w-full">
                          {brandName}
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(activeZoneName, String(n))}
                    className={`group relative flex h-16 flex-col items-center justify-center rounded-xl border px-2 py-1 font-bold transition duration-150 active:scale-95 ${
                      isSelected
                        ? `${activeMeta.selectedBg} ${activeMeta.selectedBorder}`
                        : "border-zinc-200/90 bg-white text-zinc-800 shadow-xs hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-750"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                          <span className="text-xs font-black tracking-wide text-white">
                            {boothCode}
                          </span>
                        </div>
                        {brandName && (
                          <span className="truncate max-w-full text-[11px] font-bold text-white/90">
                            {brandName}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-black tracking-wide text-zinc-900 dark:text-zinc-100">
                          {boothCode}
                        </span>
                        {brandName ? (
                          <span className="truncate max-w-full text-[10px] font-semibold text-zinc-500 dark:text-zinc-300">
                            {brandName}
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-zinc-400">
                            Available
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {fullscreenMap && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFullscreenMap(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-zinc-900 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullscreenMap(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={fullscreenMap}
              alt="Floor Plan Fullscreen"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
