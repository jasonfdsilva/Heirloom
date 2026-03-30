import { useState } from "react";
import type { GrowingSpace } from "../types";
import type { ScheduleItem } from "../types";

// ─── Layout config (feet) ─────────────────────────────────────────────────────
// Approximate real-world positions based on bed names and dimensions.
// Coordinate origin = top-left corner of garden.
const BED_POSITIONS: Record<string, { x: number; y: number }> = {
  "Left Wall Chili Bed":      { x: 0,  y: 1  },  // 2×26 — runs down left wall
  "Upper Long Bed":           { x: 3,  y: 0  },  // 19×4 — top horizontal strip
  "Tomato Bed":               { x: 3,  y: 5  },  // 6×6
  "Main Center Bed":          { x: 10, y: 5  },  // 8×8
  "Beet Bed":                 { x: 18, y: 5  },  // 4×2
  "Zucchini & Edamame Bed":   { x: 3,  y: 13 },  // 8×5
  "Bottom Pepper Bed":        { x: 3,  y: 25 },  // 19×2
};

// SVG viewport in "feet", 1 unit = 1 ft
const GARDEN_W = 24;  // ft
const GARDEN_H = 29;  // ft
const SCALE = 20;     // px per ft (renders ~480×580px, scales responsively via CSS)

// Color palette for each bed (fill, stroke, text)
const BED_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  "Upper Long Bed":           { fill: "#d1fae5", stroke: "#6ee7b7", text: "#065f46" }, // emerald — greens
  "Tomato Bed":               { fill: "#fee2e2", stroke: "#fca5a5", text: "#991b1b" }, // red — tomatoes
  "Main Center Bed":          { fill: "#ede9fe", stroke: "#c4b5fd", text: "#4c1d95" }, // purple — mixed
  "Beet Bed":                 { fill: "#fce7f3", stroke: "#f9a8d4", text: "#831843" }, // pink — beets
  "Zucchini & Edamame Bed":   { fill: "#fef9c3", stroke: "#fde047", text: "#713f12" }, // yellow — squash
  "Bottom Pepper Bed":        { fill: "#ffedd5", stroke: "#fdba74", text: "#7c2d12" }, // orange — peppers
  "Left Wall Chili Bed":      { fill: "#fee2e2", stroke: "#f87171", text: "#7f1d1d" }, // red — chili
};

const DEFAULT_COLOR = { fill: "#f3f4f6", stroke: "#d1d5db", text: "#374151" };

// Container colors by content keyword
function containerColor(notes: string | null): string {
  const n = (notes ?? "").toLowerCase();
  if (n.includes("tomato")) return "#fca5a5";
  if (n.includes("cucumber")) return "#6ee7b7";
  if (n.includes("romaine") || n.includes("lettuce")) return "#bbf7d0";
  if (n.includes("pea")) return "#a7f3d0";
  if (n.includes("mint") || n.includes("herb") || n.includes("basil") ||
      n.includes("rosemary") || n.includes("sage") || n.includes("parsley") ||
      n.includes("oregano") || n.includes("thyme") || n.includes("dill") || n.includes("cilantro")) return "#a3e635";
  if (n.includes("strawberry")) return "#f9a8d4";
  if (n.includes("horseradish") || n.includes("lemongrass")) return "#fde68a";
  return "#e5e7eb";
}

interface Props {
  spaces: GrowingSpace[];
  schedule: ScheduleItem[];
  varietyNames?: Record<number, string>;
}

export function GardenMap({ spaces, schedule, varietyNames = {} }: Props) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const beds = spaces.filter((s) => s.type === "raised_bed");
  const containers = spaces.filter((s) => s.type === "container");

  // Count active plantings per space
  const plantingsBySpace: Record<number, ScheduleItem[]> = {};
  for (const item of schedule) {
    if (!plantingsBySpace[item.space_id]) plantingsBySpace[item.space_id] = [];
    plantingsBySpace[item.space_id].push(item);
  }

  const hoveredSpace = spaces.find((s) => s.id === hoveredId);
  const hoveredPlantings = hoveredId ? (plantingsBySpace[hoveredId] ?? []) : [];

  const svgW = GARDEN_W * SCALE;
  const svgH = GARDEN_H * SCALE;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Garden Layout</h2>
          <p className="text-xs text-gray-400 mt-0.5">Approximate overhead view · hover a bed for details</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-garden-200 border border-garden-400 inline-block" />
            Raised bed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-200 border border-amber-400 inline-block" />
            Container
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* SVG map */}
        <div className="flex-1 overflow-x-auto p-4">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full max-w-lg mx-auto"
            style={{ minWidth: 300 }}
          >
            {/* Background — grass/garden area */}
            <rect x={0} y={0} width={svgW} height={svgH}
              fill="#f0fdf4" rx={8} />

            {/* Subtle grid (2ft) */}
            {Array.from({ length: Math.ceil(GARDEN_W / 2) }, (_, i) => (
              <line key={`gx${i}`}
                x1={(i * 2) * SCALE} y1={0} x2={(i * 2) * SCALE} y2={svgH}
                stroke="#d1fae5" strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.ceil(GARDEN_H / 2) }, (_, i) => (
              <line key={`gy${i}`}
                x1={0} y1={(i * 2) * SCALE} x2={svgW} y2={(i * 2) * SCALE}
                stroke="#d1fae5" strokeWidth={0.5} />
            ))}

            {/* Raised beds */}
            {beds.map((bed) => {
              const pos = BED_POSITIONS[bed.name];
              if (!pos) return null;

              const bx = pos.x * SCALE;
              const by = pos.y * SCALE;
              const bw = (bed.width_ft ?? 4) * SCALE;
              const bh = (bed.length_ft ?? 4) * SCALE;
              const color = BED_COLORS[bed.name] ?? DEFAULT_COLOR;
              const isHovered = hoveredId === bed.id;
              const plantings = plantingsBySpace[bed.id] ?? [];
              const hasFrostRisk = plantings.some((p) => p.frost_risk);

              return (
                <g key={bed.id}
                  onMouseEnter={() => setHoveredId(bed.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Bed fill */}
                  <rect
                    x={bx} y={by} width={bw} height={bh}
                    fill={isHovered ? color.stroke : color.fill}
                    stroke={color.stroke}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    rx={4}
                  />

                  {/* Frost risk indicator */}
                  {hasFrostRisk && (
                    <circle cx={bx + bw - 6} cy={by + 6} r={5}
                      fill="#ef4444" stroke="white" strokeWidth={1} />
                  )}

                  {/* Planting count badge */}
                  {plantings.length > 0 && (
                    <g>
                      <circle cx={bx + 8} cy={by + 8} r={7}
                        fill={color.stroke} />
                      <text x={bx + 8} y={by + 12}
                        fontSize={8} fontWeight="700"
                        fill={color.text} textAnchor="middle">
                        {plantings.length}
                      </text>
                    </g>
                  )}

                  {/* Bed name — only if enough space */}
                  {bw >= 60 && bh >= 25 && (
                    <text
                      x={bx + bw / 2}
                      y={by + bh / 2 - (bh >= 40 ? 6 : 0)}
                      fontSize={Math.min(11, bw / (bed.name.length * 0.6))}
                      fontWeight="600"
                      fill={color.text}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: "none" }}
                    >
                      {bed.name.length > 16 ? bed.name.slice(0, 14) + "…" : bed.name}
                    </text>
                  )}

                  {/* Dimensions label */}
                  {bw >= 60 && bh >= 50 && (
                    <text
                      x={bx + bw / 2}
                      y={by + bh / 2 + 10}
                      fontSize={8}
                      fill={color.text}
                      fillOpacity={0.7}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: "none" }}
                    >
                      {bed.width_ft}' × {bed.length_ft}'
                    </text>
                  )}

                  {/* Narrow bed — rotated label */}
                  {(bw < 60 || bh < 25) && bh >= 60 && (
                    <text
                      x={bx + bw / 2}
                      y={by + bh / 2}
                      fontSize={9}
                      fontWeight="600"
                      fill={color.text}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(-90, ${bx + bw / 2}, ${by + bh / 2})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {bed.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Compass / scale */}
            <g transform={`translate(${svgW - 28}, ${svgH - 28})`}>
              <circle cx={0} cy={0} r={14} fill="white" fillOpacity={0.8} stroke="#d1d5db" strokeWidth={1} />
              <text x={0} y={-5} fontSize={7} textAnchor="middle" fill="#6b7280" fontWeight="700">N</text>
              <line x1={0} y1={-3} x2={0} y2={3} stroke="#9ca3af" strokeWidth={1} />
              <line x1={-3} y1={0} x2={3} y2={0} stroke="#9ca3af" strokeWidth={1} />
            </g>

            {/* Scale bar */}
            <g transform={`translate(8, ${svgH - 14})`}>
              <line x1={0} y1={0} x2={4 * SCALE} y2={0} stroke="#6b7280" strokeWidth={1.5} />
              <line x1={0} y1={-3} x2={0} y2={3} stroke="#6b7280" strokeWidth={1.5} />
              <line x1={4 * SCALE} y1={-3} x2={4 * SCALE} y2={3} stroke="#6b7280" strokeWidth={1.5} />
              <text x={2 * SCALE} y={-5} fontSize={7} textAnchor="middle" fill="#6b7280">4 ft</text>
            </g>
          </svg>
        </div>

        {/* Right panel: hover detail + containers */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col">
          {/* Hover tooltip */}
          <div className={`p-4 border-b border-gray-100 transition-all ${hoveredSpace ? "bg-gray-50" : ""}`}>
            {hoveredSpace ? (
              <div>
                <p className="font-semibold text-gray-900">{hoveredSpace.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {hoveredSpace.width_ft && hoveredSpace.length_ft
                    ? `${hoveredSpace.width_ft}' × ${hoveredSpace.length_ft}' = ${hoveredSpace.width_ft * hoveredSpace.length_ft} sq ft`
                    : "Container"}
                </p>
                {hoveredSpace.notes && (
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{hoveredSpace.notes}</p>
                )}
                {hoveredPlantings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">{hoveredPlantings.length} planting{hoveredPlantings.length > 1 ? "s" : ""}</p>
                    <ul className="space-y-0.5">
                      {hoveredPlantings.slice(0, 5).map((p) => (
                        <li key={p.planting_id}
                          className={`text-xs flex items-center gap-1.5 ${p.frost_risk ? "text-red-600" : "text-gray-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            p.status === "growing" ? "bg-garden-500" :
                            p.status === "started" ? "bg-blue-400" :
                            p.frost_risk ? "bg-red-400" : "bg-gray-300"
                          }`} />
                          {varietyNames[p.variety_id] ?? `Variety #${p.variety_id}`}{p.frost_risk ? " ❄" : ""}
                        </li>
                      ))}
                      {hoveredPlantings.length > 5 && (
                        <li className="text-xs text-gray-400">+{hoveredPlantings.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Hover a bed to see details</p>
            )}
          </div>

          {/* Containers grid */}
          <div className="p-4 flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Containers ({containers.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {containers.map((c) => {
                const isHov = hoveredId === c.id;
                const plantings = plantingsBySpace[c.id] ?? [];
                return (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    title={c.name}
                    className={`relative flex flex-col items-center gap-1 cursor-pointer group`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        isHov ? "scale-110 shadow-md" : ""
                      }`}
                      style={{
                        backgroundColor: containerColor(c.notes),
                        borderColor: isHov ? "#6b7280" : "#d1d5db",
                      }}
                    >
                      {plantings.length > 0 && (
                        <span className="text-xs font-bold text-gray-700">{plantings.length}</span>
                      )}
                    </div>
                    <span className="text-center leading-tight"
                      style={{ fontSize: "9px", color: "#6b7280", maxWidth: "44px",
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {c.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
