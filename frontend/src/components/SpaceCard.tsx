import type { GrowingSpace } from "../types";

interface Props {
  space: GrowingSpace;
  onClick?: () => void;
}

const BED_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="13" rx="2" strokeWidth="2" />
    <path strokeWidth="2" strokeLinecap="round" d="M2 10h20" />
  </svg>
);

const CONTAINER_ICON = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      d="M3 7h18M5 7l1 13h12L19 7M9 11v5M15 11v5M10 7V4a1 1 0 011-1h2a1 1 0 011 1v3" />
  </svg>
);

export function SpaceCard({ space, onClick }: Props) {
  const isRaisedBed = space.type === "raised_bed";
  const sqft =
    space.width_ft && space.length_ft
      ? `${space.width_ft}' × ${space.length_ft}'`
      : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-garden-400 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`p-1.5 rounded-lg ${
              isRaisedBed
                ? "bg-garden-100 text-garden-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isRaisedBed ? BED_ICON : CONTAINER_ICON}
          </span>
          <div>
            <p className="font-medium text-gray-900 group-hover:text-garden-700 transition-colors">
              {space.name}
            </p>
            {sqft && (
              <p className="text-xs text-gray-400 mt-0.5">{sqft}</p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            isRaisedBed
              ? "bg-garden-50 text-garden-600"
              : "bg-amber-50 text-amber-600"
          }`}
        >
          {isRaisedBed ? "Bed" : "Container"}
        </span>
      </div>
      {space.notes && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{space.notes}</p>
      )}
    </button>
  );
}
