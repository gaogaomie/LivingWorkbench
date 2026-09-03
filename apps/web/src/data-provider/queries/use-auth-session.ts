import { useQuery } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "../query-keys";

export function useAuthSession() {
  return useQuery({
    queryKey: queryKeys.authSession,
    queryFn: authService.getSession,
    retry: false,
    staleTime: 60_000,
  });
}
