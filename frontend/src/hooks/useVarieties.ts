import { useQuery } from "@tanstack/react-query";
import { api, varietyApi } from "../api/client";
import type { PlantVariety, SeedLot } from "../types";

export function useVarieties() {
  return useQuery<PlantVariety[]>({
    queryKey: ["varieties"],
    queryFn: () => varietyApi.list().then((r) => r.data),
  });
}

export function useVariety(id: number) {
  return useQuery<PlantVariety>({
    queryKey: ["variety", id],
    queryFn: () => varietyApi.get(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSeedLots(varietyId: number) {
  return useQuery<SeedLot[]>({
    queryKey: ["seedlots", varietyId],
    queryFn: () => api.get(`/varieties/${varietyId}/seedlots`).then((r) => r.data),
    enabled: !!varietyId,
  });
}
