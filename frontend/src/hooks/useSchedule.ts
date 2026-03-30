import { useQuery } from "@tanstack/react-query";
import { gardenApi } from "../api/client";
import type { ScheduleItem } from "../types";
import { GARDEN_ID } from "./useGarden";

export function useSchedule(seasonId?: number) {
  return useQuery<ScheduleItem[]>({
    queryKey: ["schedule", GARDEN_ID, seasonId],
    queryFn: () =>
      gardenApi.schedule(GARDEN_ID, seasonId ? { season_id: seasonId } : undefined)
        .then((r) => r.data),
  });
}
