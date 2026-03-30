import { parseISO, differenceInDays, format } from "date-fns";
import { useState } from "react";
import { useSchedule } from "../hooks/useSchedule";
import { useSeasons } from "../hooks/useGarden";
import { useVarieties } from "../hooks/useVarieties";
import type { ScheduleItem } from "../types";

// ─── Chart constants ──────────────────────────────────────────────────────────
const CHART_START = new Date(2026, 0, 1);  // Jan 1 2026
const CHART_END   = new Date(2026, 11, 1); // Dec 1 2026
const TOTAL_DAYS  = differenceInDays(CHART_END, CHART_START); // 334

const LAST_FROST  = new Date(2026, 3, 23); // Apr 23
const FIRST_FROST = new Date(2026, 9, 22); // Oct 22
const TODAY       = new Date();

// Month labels along the X axis
const MONTHS = Array.from({ length: 11 }, (_, i) => new Date(2026, i + 1, 1));

function pct(d: Date | null): number | null {
  if (!d) return null;
  const days = differenceInDays(d, CHART_START);
  return Math.max(0, Math.min(100, (days / TOTAL_DAYS) * 100));
}

function parseDateOrNull(s: string | null): Date | null {
  return s ? parseISO(s) : null;
}

// Harvest window: use days_to_maturity or default 28 days
function harvestEnd(start: Date, dtm: string | null): Date {
  let days = 28;
  if (dtm) {
    const match = dtm.match(/\d+/);
    if (match) days = Math.min(parseInt(match[0], 10), 60);
  }
  const d = new Date(start);
  d.setDate(d.getDate() + days);
  return d;
}

interface GanttRowProps {
  item: ScheduleItem;
  varietyName: string;
  dtm: string | null;
  showPlanned: boolean;
}

function GanttRow({ item, varietyName, dtm, showPlanned }: GanttRowProps) {
  const sowDate = parseDateOrNull(item.actual_sow_date ?? item.projected_sow_date);
  const transplantDate = parseDateOrNull(item.actual_transplant_date ?? item.projected_transplant_date);
  const harvestDate = parseDateOrNull(item.projected_harvest_start);

  const plannedSow = showPlanned ? parseDateOrNull(item.planned_sow_date) : null;
  const plannedHarvest = showPlanned ? parseDateOrNull(item.planned_harvest_start) : null;

  if (!sowDate && !harvestDate) return null;

  const effectiveSow = sowDate ?? harvestDate!;
  const effectiveEnd = harvestDate ? harvestEnd(harvestDate, dtm) : null;

  const sowPct = pct(effectiveSow);
  const transplantPct = transplantDate ? pct(transplantDate) : null;
  const harvestPct = harvestDate ? pct(harvestDate) : null;
  const endPct = effectiveEnd ? pct(effectiveEnd) : null;

  // Indoor segment: sow → transplant
  const hasIndoor = item.sow_type === "indoor_start" && transplantPct != null && sowPct != null;
  // Outdoor growing: transplant (or sow if direct) → harvest
  const growStart = transplantPct ?? sowPct;
  // Harvest window
  const hasHarvest = harvestPct != null && endPct != null;

  const isActualized = !!item.actual_sow_date;

  return (
    <div className="relative flex items-center group hover:bg-gray-50 border-b border-gray-100 last:border-0">
      {/* Row label */}
      <div className="w-40 flex-shrink-0 px-3 py-2 text-sm truncate">
        <span className={`font-medium ${item.frost_risk ? "text-red-700" : "text-gray-800"}`}>
          {varietyName}
        </span>
        {item.frost_risk && (
          <span className="ml-1 text-xs text-red-500" title="Frost risk">❄</span>
        )}
        <div className="text-xs text-gray-400">{item.sow_type}</div>
      </div>

      {/* Bar area */}
      <div className="flex-1 relative h-8 mr-3">
        {/* Planned ghost bars */}
        {showPlanned && plannedSow && plannedHarvest && (
          <>
            {(() => {
              const ps = pct(plannedSow);
              const ph = pct(plannedHarvest);
              const pe = pct(harvestEnd(plannedHarvest, dtm));
              if (ps == null || ph == null || pe == null) return null;
              return (
                <div
                  className="absolute top-1.5 h-1 rounded-sm opacity-30 bg-gray-400"
                  style={{ left: `${ps}%`, width: `${pe - ps}%` }}
                  title={`Planned: ${format(plannedSow, "MMM d")} – ${format(plannedHarvest, "MMM d")}`}
                />
              );
            })()}
          </>
        )}

        {/* Indoor start bar (dark green) */}
        {hasIndoor && sowPct != null && transplantPct != null && (
          <div
            className={`absolute top-1 h-6 rounded-l ${isActualized ? "bg-garden-700" : "bg-garden-600"} flex items-center`}
            style={{ left: `${sowPct}%`, width: `${Math.max(transplantPct - sowPct, 0.5)}%` }}
            title={`Indoor: ${format(effectiveSow, "MMM d")} → ${transplantDate ? format(transplantDate, "MMM d") : ""}`}
          >
            <span className="text-white text-xs px-1 hidden lg:block truncate" style={{ fontSize: "10px" }}>
              {format(effectiveSow, "M/d")}
            </span>
          </div>
        )}

        {/* Growing bar (medium green) */}
        {growStart != null && harvestPct != null && (
          <div
            className={`absolute top-1 h-6 ${hasIndoor ? "" : "rounded-l"} ${hasHarvest ? "" : "rounded-r"} ${isActualized ? "bg-garden-500" : "bg-garden-400"}`}
            style={{ left: `${growStart}%`, width: `${Math.max(harvestPct - growStart, 0.5)}%` }}
            title={`Growing: ${transplantDate ? format(transplantDate, "MMM d") : format(effectiveSow, "MMM d")} → ${harvestDate ? format(harvestDate, "MMM d") : ""}`}
          />
        )}

        {/* Harvest bar (amber) */}
        {hasHarvest && harvestPct != null && endPct != null && (
          <div
            className={`absolute top-1 h-6 rounded-r ${item.frost_risk ? "bg-red-400" : "bg-amber-400"}`}
            style={{ left: `${harvestPct}%`, width: `${Math.max(endPct - harvestPct, 0.5)}%` }}
            title={`Harvest: ${harvestDate ? format(harvestDate, "MMM d") : ""}`}
          >
            <span className="text-white text-xs px-1 hidden xl:block truncate" style={{ fontSize: "10px" }}>
              {harvestDate ? format(harvestDate, "M/d") : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GanttChart({ items, varietyMap, dtmMap, showPlanned }: {
  items: ScheduleItem[];
  varietyMap: Record<number, string>;
  dtmMap: Record<number, string | null>;
  showPlanned: boolean;
}) {
  const todayPct = pct(TODAY);
  const lastFrostPct = pct(LAST_FROST);
  const firstFrostPct = pct(FIRST_FROST);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header row with month labels */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="w-40 flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Crop
        </div>
        <div className="flex-1 relative h-8 mr-3">
          {MONTHS.map((m) => {
            const p = pct(m);
            if (p == null) return null;
            return (
              <span
                key={m.toISOString()}
                className="absolute top-2 text-xs text-gray-400 -translate-x-1/2"
                style={{ left: `${p}%` }}
              >
                {format(m, "MMM")}
              </span>
            );
          })}
        </div>
      </div>

      {/* Chart rows with vertical grid + markers */}
      <div className="relative">
        {/* Vertical grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {MONTHS.map((m) => {
            const p = pct(m);
            if (p == null) return null;
            return (
              <div
                key={m.toISOString()}
                className="absolute top-0 bottom-0 border-l border-gray-100"
                style={{ left: `calc(${p}% + 160px)` }}
              />
            );
          })}

          {/* Last frost line */}
          {lastFrostPct != null && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-400 opacity-60 z-10"
              style={{ left: `calc(${lastFrostPct}% + 160px)` }}
            >
              <span className="absolute top-0 text-xs text-blue-500 ml-1 whitespace-nowrap bg-white px-0.5">
                Last frost
              </span>
            </div>
          )}

          {/* First frost line */}
          {firstFrostPct != null && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-400 opacity-60 z-10"
              style={{ left: `calc(${firstFrostPct}% + 160px)` }}
            >
              <span className="absolute top-0 text-xs text-orange-500 ml-1 whitespace-nowrap bg-white px-0.5">
                First frost
              </span>
            </div>
          )}

          {/* Today line */}
          {todayPct != null && (
            <div
              className="absolute top-0 bottom-0 border-l-2 border-red-500 opacity-80 z-20"
              style={{ left: `calc(${todayPct}% + 160px)` }}
            >
              <span className="absolute top-0 text-xs text-red-500 ml-1 font-semibold whitespace-nowrap bg-white px-0.5">
                Today
              </span>
            </div>
          )}
        </div>

        {/* Data rows */}
        {items.map((item) => (
          <GanttRow
            key={item.planting_id}
            item={item}
            varietyName={varietyMap[item.variety_id] ?? `Variety ${item.variety_id}`}
            dtm={dtmMap[item.variety_id] ?? null}
            showPlanned={showPlanned}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-garden-700 inline-block" /> Indoor start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-garden-400 inline-block" /> Growing
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-amber-400 inline-block" /> Harvest window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-red-400 inline-block" /> Frost risk harvest
        </span>
        {showPlanned && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1.5 rounded bg-gray-400 opacity-50 inline-block" /> Original plan
          </span>
        )}
      </div>
    </div>
  );
}

// Group items by a label
function groupByType(items: ScheduleItem[], varietyMap: Record<number, string>) {
  const groups: Record<string, ScheduleItem[]> = {};
  for (const item of items) {
    const name = varietyMap[item.variety_id] ?? "Other";
    // Rough category by name
    let cat = "Other";
    const n = name.toLowerCase();
    if (n.includes("tomato") || n.includes("granadero") || n.includes("nova") || n.includes("bumble") || n.includes("carbon") || n.includes("new girl") || n.includes("indigo")) {
      cat = "Tomatoes";
    } else if (n.includes("pepper") || n.includes("shishito") || n.includes("ace") || n.includes("pantera") || n.includes("sidekick")) {
      cat = "Peppers";
    } else if (n.includes("broccoli") || n.includes("kale") || n.includes("lettuce") || n.includes("spinach") || n.includes("arugula") || n.includes("mesclun")) {
      cat = "Greens & Brassicas";
    } else if (n.includes("beet") || n.includes("carrot") || n.includes("scallion") || n.includes("radish")) {
      cat = "Root Veg & Alliums";
    } else if (n.includes("cucumber") || n.includes("gourd") || n.includes("zucchini")) {
      cat = "Cucurbits";
    } else if (n.includes("bean") || n.includes("pea") || n.includes("edamame")) {
      cat = "Legumes";
    } else if (n.includes("basil") || n.includes("cilantro") || n.includes("herb")) {
      cat = "Herbs";
    }
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  // Sort group order
  const ORDER = ["Tomatoes", "Peppers", "Greens & Brassicas", "Root Veg & Alliums", "Cucurbits", "Legumes", "Herbs", "Other"];
  return ORDER.filter((k) => groups[k]).map((k) => ({ label: k, items: groups[k] }));
}

export function Schedule() {
  const { data: schedule = [], isLoading } = useSchedule();
  const { data: seasons = [] } = useSeasons();
  const { data: varieties = [] } = useVarieties();
  const [showPlanned, setShowPlanned] = useState(false);
  const [groupBy, setGroupBy] = useState<"none" | "category">("category");
  const [filter, setFilter] = useState<"all" | "indoor_start" | "direct">("all");

  const season2026 = seasons.find((s) => s.year === 2026) ?? seasons[0];

  const varietyMap = Object.fromEntries(varieties.map((v) => [v.id, v.common_name]));
  const dtmMap = Object.fromEntries(varieties.map((v) => [v.id, v.days_to_maturity]));

  const filtered = schedule.filter((s) => {
    if (filter === "indoor_start") return s.sow_type === "indoor_start";
    if (filter === "direct") return s.sow_type === "direct";
    return true;
  });

  const frostRiskCount = schedule.filter((s) => s.frost_risk).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">2026 Planting Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {schedule.length} plantings
            {season2026?.delay_weeks ? ` · ${season2026.delay_weeks}wk delay applied` : ""}
            {frostRiskCount > 0 ? ` · ${frostRiskCount} at frost risk` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
            {(["none", "category"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-3 py-1 rounded-md transition-colors ${groupBy === g ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
              >
                {g === "none" ? "Timeline" : "By Crop"}
              </button>
            ))}
          </div>
          {/* Filter */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
            {(["all", "indoor_start", "direct"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md transition-colors ${filter === f ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
              >
                {f === "all" ? "All" : f === "indoor_start" ? "Indoor" : "Direct"}
              </button>
            ))}
          </div>
          {/* Show planned toggle */}
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              className="rounded"
            />
            Delay shift
          </label>
        </div>
      </div>

      {/* Delay banner */}
      {season2026?.delay_weeks > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            All dates shifted <strong>+{season2026.delay_weeks} weeks</strong> from original plan.
            {season2026.delay_reason && ` Reason: ${season2026.delay_reason}.`}
            {showPlanned && " Ghosted bars show the original planned dates."}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Loading schedule…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No plantings found.</div>
      ) : groupBy === "none" ? (
        <div className="overflow-x-auto">
          <GanttChart
            items={filtered}
            varietyMap={varietyMap}
            dtmMap={dtmMap}
            showPlanned={showPlanned}
          />
        </div>
      ) : (
        <div className="space-y-4 overflow-x-auto">
          {groupByType(filtered, varietyMap).map(({ label, items }) => (
            <div key={label}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">{label}</h3>
              <GanttChart
                items={items}
                varietyMap={varietyMap}
                dtmMap={dtmMap}
                showPlanned={showPlanned}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
