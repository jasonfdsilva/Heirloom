import { useState } from "react";
import { PacketScanModal } from "../components/PacketScanModal";
import { useVarieties } from "../hooks/useVarieties";
import type { PlantVariety } from "../types";

const PLANT_TYPE_COLORS: Record<string, string> = {
  annual: "bg-green-100 text-green-700 border-green-200",
  perennial: "bg-purple-100 text-purple-700 border-purple-200",
  biennial: "bg-blue-100 text-blue-700 border-blue-200",
};

// Simple crop-type categorization for grouping
function cropCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tomato") || n.includes("granadero") || n.includes("nova") || n.includes("bumble") || n.includes("carbon") || n.includes("new girl") || n.includes("indigo")) return "Tomatoes";
  if (n.includes("pepper") || n.includes("shishito") || n.includes("ace") || n.includes("pantera")) return "Peppers";
  if (n.includes("broccoli") || n.includes("kale") || n.includes("lettuce") || n.includes("spinach") || n.includes("arugula") || n.includes("mesclun") || n.includes("sidekick")) return "Greens & Brassicas";
  if (n.includes("beet") || n.includes("carrot") || n.includes("scallion") || n.includes("radish")) return "Root Veg & Alliums";
  if (n.includes("cucumber") || n.includes("gourd") || n.includes("zucchini")) return "Cucurbits";
  if (n.includes("bean") || n.includes("pea") || n.includes("edamame")) return "Legumes";
  if (n.includes("basil") || n.includes("cilantro") || n.includes("herb")) return "Herbs";
  return "Other";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Tomatoes": "bg-red-50 border-red-100",
  "Peppers": "bg-orange-50 border-orange-100",
  "Greens & Brassicas": "bg-garden-50 border-garden-100",
  "Root Veg & Alliums": "bg-amber-50 border-amber-100",
  "Cucurbits": "bg-yellow-50 border-yellow-100",
  "Legumes": "bg-lime-50 border-lime-100",
  "Herbs": "bg-teal-50 border-teal-100",
  "Other": "bg-gray-50 border-gray-100",
};

const CATEGORY_ORDER = ["Tomatoes", "Peppers", "Greens & Brassicas", "Root Veg & Alliums", "Cucurbits", "Legumes", "Herbs", "Other"];

function VarietyCard({ v, onSelect, isSelected }: { v: PlantVariety; onSelect: () => void; isSelected: boolean }) {
  const catColor = CATEGORY_COLORS[cropCategory(v.common_name)] ?? "bg-white border-gray-200";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${
        isSelected
          ? "border-garden-400 shadow-md ring-1 ring-garden-300 bg-white"
          : `${catColor} hover:border-garden-300`
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 leading-tight">{v.common_name}</p>
          {v.latin_name && (
            <p className="text-xs italic text-gray-400 mt-0.5 truncate">{v.latin_name}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${PLANT_TYPE_COLORS[v.plant_type] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
          {v.plant_type}
        </span>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {v.days_to_maturity && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {v.days_to_maturity}d maturity
          </span>
        )}
        {v.days_to_germination && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {v.days_to_germination}d germ
          </span>
        )}
        {v.spacing_inches && (
          <span>{v.spacing_inches}" spacing</span>
        )}
      </div>

      {/* Expanded detail */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-2">
            {v.sow_depth_inches && (
              <Detail label="Sow Depth" value={`${v.sow_depth_inches}"`} />
            )}
          </div>
          {v.notes && (
            <div className="mt-2 bg-white bg-opacity-60 rounded-lg p-2.5">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{v.notes}</p>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-700 font-medium text-sm">{value}</p>
    </div>
  );
}

export function Plants() {
  const { data: varieties = [], isLoading } = useVarieties();
  const [search, setSearch] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "grouped">("grouped");

  const filtered = varieties.filter(
    (v) =>
      v.common_name.toLowerCase().includes(search.toLowerCase()) ||
      (v.latin_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  // Group by category
  const grouped: Record<string, PlantVariety[]> = {};
  for (const v of filtered) {
    const cat = cropCategory(v.common_name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(v);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-gray-400">Loading varieties…</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plant Varieties</h1>
          <p className="text-sm text-gray-500 mt-0.5">{varieties.length} varieties in your catalog</p>
        </div>
        <button
          onClick={() => setShowScan(true)}
          className="flex items-center gap-2 bg-garden-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-garden-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan Packet
        </button>
      </div>

      {/* Search + view toggle */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search varieties…"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-garden-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-sm">
          {(["grouped", "grid"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1 rounded-md transition-colors ${viewMode === m ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500"}`}
            >
              {m === "grouped" ? "By Type" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          {varieties.length === 0 ? (
            <div className="space-y-3">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="font-medium text-gray-600">No varieties yet</p>
              <p className="text-sm">Scan a seed packet to add your first variety</p>
              <button
                onClick={() => setShowScan(true)}
                className="mt-2 inline-flex items-center gap-2 bg-garden-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-garden-700"
              >
                Scan your first packet
              </button>
            </div>
          ) : (
            <p>No varieties match "{search}"</p>
          )}
        </div>
      )}

      {/* Varieties */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((v) => (
            <VarietyCard
              key={v.id}
              v={v}
              onSelect={() => setSelected(selected === v.id ? null : v.id)}
              isSelected={selected === v.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{cat}</h3>
                <span className="text-xs text-gray-400">({grouped[cat].length})</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {grouped[cat].map((v) => (
                  <VarietyCard
                    key={v.id}
                    v={v}
                    onSelect={() => setSelected(selected === v.id ? null : v.id)}
                    isSelected={selected === v.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showScan && <PacketScanModal onClose={() => setShowScan(false)} />}
    </div>
  );
}
