import { useQuery } from "@tanstack/react-query";
import { healthService } from "@/services/health.service";
import { queryKeys } from "../query-keys";

export function useServerHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: healthService.getReadyState,
    retry: 1,
  });
}
