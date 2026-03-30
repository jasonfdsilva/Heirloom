import { useState } from "react";
import { AddSpaceModal } from "../components/AddSpaceModal";
import { GardenMap } from "../components/GardenMap";
import { SpaceCard } from "../components/SpaceCard";
import { useGarden, useSpaces } from "../hooks/useGarden";
import { useSchedule } from "../hooks/useSchedule";
import { useVarieties } from "../hooks/useVarieties";
import type { GrowingSpace } from "../types";

export function Garden() {
  const { data: garden, isLoading: gardenLoading } = useGarden();
  const { data: spaces = [], isLoading: spacesLoading } = useSpaces();
  const { data: schedule = [] } = useSchedule();
  const { data: varieties = [] } = useVarieties();
  const varietyNames = Object.fromEntries(varieties.map((v) => [v.id, v.common_name]));
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"beds" | "containers">("beds");

  const beds = spaces.filter((s) => s.type === "raised_bed");
  const containers = spaces.filter((s) => s.type === "container");

  const totalBedSqft = beds.reduce(
    (sum, b) => sum + (b.width_ft ?? 0) * (b.length_ft ?? 0),
    0
  );

  if (gardenLoading || spacesLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading garden…
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{garden?.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{garden?.location_description}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-garden-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-garden-700 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add Space
        </button>
      </div>

      {/* Frost date banner */}
      {garden && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <span className="text-blue-700">
            <span className="font-medium">Last frost:</span> April 23
          </span>
          <span className="text-blue-700">
            <span className="font-medium">First frost:</span> October 22
          </span>
          <span className="text-blue-500">Zone 6b · Zip 07922</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Raised Beds" value={beds.length} />
        <Stat label="Containers" value={containers.length} />
        <Stat label="Total Bed Sq Ft" value={totalBedSqft} />
      </div>

      {/* Garden map */}
      <GardenMap spaces={spaces} schedule={schedule} varietyNames={varietyNames} />

      {/* Tab toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
        {(["beds", "containers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "beds" ? `Raised Beds (${beds.length})` : `Containers (${containers.length})`}
          </button>
        ))}
      </div>

      {/* Space grid */}
      <SpaceGrid spaces={activeTab === "beds" ? beds : containers} />

      {showAdd && <AddSpaceModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-garden-700">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function SpaceGrid({ spaces }: { spaces: GrowingSpace[] }) {
  if (spaces.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No spaces yet. Click "Add Space" to get started.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {spaces.map((space) => (
        <SpaceCard key={space.id} space={space} />
      ))}
    </div>
  );
}
