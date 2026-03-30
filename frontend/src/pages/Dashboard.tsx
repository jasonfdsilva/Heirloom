import { differenceInDays, format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { useGarden, useSeasons, useSpaces } from "../hooks/useGarden";
import { useSchedule } from "../hooks/useSchedule";
import { useVarieties } from "../hooks/useVarieties";
import type { ScheduleItem } from "../types";

const TODAY = new Date();
const LAST_FROST = new Date(TODAY.getFullYear(), 3, 23); // Apr 23
const FIRST_FROST = new Date(TODAY.getFullYear(), 9, 22); // Oct 22
const GROW_LIGHT_MAX = 8;

function daysUntil(target: Date): number {
  return differenceInDays(target, TODAY);
}

function sowTypeLabel(t: string) {
  if (t === "indoor_start") return "Start indoors";
  if (t === "direct") return "Direct sow";
  return "Transplant";
}

export function Dashboard() {
  const { data: garden } = useGarden();
  const { data: seasons = [] } = useSeasons();
  const { data: spaces = [] } = useSpaces();
  const { data: schedule = [], isLoading: schedLoading } = useSchedule();
  const { data: varieties = [] } = useVarieties();

  const season2026 = seasons.find((s) => s.year === 2026) ?? seasons[0];
  const delayWeeks = season2026?.delay_weeks ?? 0;
  const delayReason = season2026?.delay_reason;

  // Frost countdowns
  const daysToLastFrost = daysUntil(LAST_FROST);
  const daysToFirstFrost = daysUntil(FIRST_FROST);
  const pastLastFrost = isAfter(TODAY, LAST_FROST);

  // Build variety lookup
  const varietyMap = Object.fromEntries(varieties.map((v) => [v.id, v]));

  // Active plantings (sow date set)
  const activePlantings = schedule.filter((s) => s.actual_sow_date).length;
  const frostRiskCount = schedule.filter((s) => s.frost_risk).length;

  // Upcoming actions: next 21 days based on projected_sow_date
  const upcomingWindow = addDays(TODAY, 21);
  const upcoming: ScheduleItem[] = schedule
    .filter((s) => {
      const d = s.actual_sow_date
        ? null // already done
        : s.projected_sow_date
        ? parseISO(s.projected_sow_date)
        : null;
      return d && !isAfter(d, upcomingWindow);
    })
    .sort((a, b) => {
      const da = a.projected_sow_date ?? "";
      const db = b.projected_sow_date ?? "";
      return da < db ? -1 : 1;
    })
    .slice(0, 8);

  // Overdue: projected date already passed, not yet sown
  const overdue: ScheduleItem[] = schedule
    .filter((s) => {
      if (s.actual_sow_date) return false;
      const d = s.projected_sow_date ? parseISO(s.projected_sow_date) : null;
      return d && isBefore(d, TODAY);
    })
    .slice(0, 6);

  const beds = spaces.filter((s) => s.type === "raised_bed");
  const containers = spaces.filter((s) => s.type === "container");

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {garden?.name ?? "My Garden"}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(TODAY, "EEEE, MMMM d, yyyy")} · Zone 6b · Berkeley Heights, NJ
        </p>
      </div>

      {/* Delay banner */}
      {delayWeeks > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800">Season is {delayWeeks} week{delayWeeks > 1 ? "s" : ""} behind schedule</p>
            {delayReason && (
              <p className="text-sm text-amber-700 mt-0.5">{delayReason}</p>
            )}
            <p className="text-sm text-amber-600 mt-1">All projected dates have been shifted forward. <Link to="/schedule" className="underline font-medium">View schedule →</Link></p>
          </div>
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Frost countdown */}
        <div className={`rounded-xl p-5 ${pastLastFrost ? "bg-garden-50 border border-garden-200" : "bg-blue-50 border border-blue-200"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">
            {pastLastFrost ? "First Frost" : "Last Frost"}
          </p>
          <p className={`text-3xl font-bold ${pastLastFrost ? "text-garden-700" : "text-blue-700"}`}>
            {pastLastFrost ? daysToFirstFrost : daysToLastFrost}
            <span className="text-lg font-medium ml-1">days</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {pastLastFrost
              ? `First frost ${format(FIRST_FROST, "MMM d")}`
              : `Safe to plant outdoors ${format(LAST_FROST, "MMM d")}`}
          </p>
        </div>

        {/* Active plantings */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Active Plantings</p>
          <p className="text-3xl font-bold text-gray-900">
            {activePlantings}
            <span className="text-lg font-medium text-gray-400 ml-1">/ {schedule.length}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{schedule.length} planned this season</p>
        </div>

        {/* Varieties */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Varieties</p>
          <p className="text-3xl font-bold text-gray-900">{varieties.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            <Link to="/plants" className="text-garden-600 hover:underline">Browse catalog →</Link>
          </p>
        </div>

        {/* Spaces */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Growing Spaces</p>
          <p className="text-3xl font-bold text-gray-900">{spaces.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {beds.length} beds · {containers.length} containers
          </p>
        </div>
      </div>

      {/* Grow lights + frost risk row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grow light capacity */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74A7 7 0 0012 2zm2 14h-4v-1h4v1zm0-3H10v-.28C8.81 11.89 8 10.52 8 9a4 4 0 118 0c0 1.52-.81 2.89-2 3.72V13z"/>
              </svg>
              <span className="font-semibold text-gray-900">Grow Light Trays</span>
            </div>
            <span className="text-sm text-gray-500">{activePlantings > GROW_LIGHT_MAX ? GROW_LIGHT_MAX : activePlantings} / {GROW_LIGHT_MAX}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
            <div
              className="bg-yellow-400 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((activePlantings / GROW_LIGHT_MAX) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {GROW_LIGHT_MAX - Math.min(activePlantings, GROW_LIGHT_MAX)} tray slot{GROW_LIGHT_MAX - activePlantings !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Frost risk */}
        <div className={`rounded-xl p-5 border ${frostRiskCount > 0 ? "bg-red-50 border-red-200" : "bg-garden-50 border-garden-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg className={`w-5 h-5 ${frostRiskCount > 0 ? "text-red-500" : "text-garden-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-semibold text-gray-900">Frost Risk</span>
          </div>
          {frostRiskCount > 0 ? (
            <>
              <p className="text-2xl font-bold text-red-700">{frostRiskCount} crops</p>
              <p className="text-xs text-red-600 mt-1">at risk of not finishing before Oct 22. <Link to="/schedule" className="underline">See schedule →</Link></p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-garden-700">All clear</p>
              <p className="text-xs text-garden-600 mt-1">No crops at risk of frost damage</p>
            </>
          )}
        </div>
      </div>

      {/* Overdue + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <h2 className="font-semibold text-gray-900">Overdue Actions</h2>
              <span className="ml-auto text-xs text-gray-400">{overdue.length} items</span>
            </div>
            <ul className="divide-y divide-gray-50">
              {overdue.map((item) => {
                const variety = varietyMap[item.variety_id];
                const d = item.projected_sow_date ? parseISO(item.projected_sow_date) : null;
                const daysLate = d ? Math.abs(differenceInDays(d, TODAY)) : 0;
                return (
                  <li key={item.planting_id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {variety?.common_name ?? `Variety #${item.variety_id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sowTypeLabel(item.sow_type)}
                        {d && ` · was ${format(d, "MMM d")}`}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {daysLate}d late
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Upcoming */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-garden-500 flex-shrink-0" />
            <h2 className="font-semibold text-gray-900">Upcoming — Next 21 Days</h2>
            <span className="ml-auto text-xs text-gray-400">{upcoming.length} items</span>
          </div>
          {schedLoading ? (
            <div className="px-5 py-6 text-sm text-gray-400">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400">Nothing to do in the next 3 weeks.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcoming.map((item) => {
                const variety = varietyMap[item.variety_id];
                const d = item.projected_sow_date ? parseISO(item.projected_sow_date) : null;
                const daysAway = d ? differenceInDays(d, TODAY) : 0;
                return (
                  <li key={item.planting_id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {variety?.common_name ?? `Variety #${item.variety_id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sowTypeLabel(item.sow_type)}
                        {d && ` · ${format(d, "MMM d")}`}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      daysAway <= 3 ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `${daysAway}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
