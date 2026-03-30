import { useParams } from "react-router-dom";

export function PlantingDetail() {
  const { plantingId } = useParams();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Planting #{plantingId}</h1>
      <p className="text-gray-500">Timeline, photos, maintenance, harvests coming soon.</p>
    </div>
  );
}
