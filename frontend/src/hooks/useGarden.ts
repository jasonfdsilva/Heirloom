import { useQuery } from "@tanstack/react-query";
import { gardenApi } from "../api/client";
import type { Garden, GrowingSpace, Season } from "../types";

export const GARDEN_ID = 1; // Single-garden MVP

export function useGarden() {
  return useQuery<Garden>({
    queryKey: ["garden", GARDEN_ID],
    queryFn: () => gardenApi.get(GARDEN_ID).then((r) => r.data),
  });
}

export function useSpaces() {
  return useQuery<GrowingSpace[]>({
    queryKey: ["spaces", GARDEN_ID],
    queryFn: () => gardenApi.spaces(GARDEN_ID).then((r) => r.data),
  });
}

export function useSeasons() {
  return useQuery<Season[]>({
    queryKey: ["seasons", GARDEN_ID],
    queryFn: () => gardenApi.seasons(GARDEN_ID).then((r) => r.data),
  });
}
