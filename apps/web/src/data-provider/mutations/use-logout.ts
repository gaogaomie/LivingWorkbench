import type { SessionResponse } from "@daily-life/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "../query-keys";

export function useLogout() {
  const queryClient = useQueryClient();
  const csrfToken =
    queryClient.getQueryData<SessionResponse>(queryKeys.authSession)?.csrfToken ?? "";

  return useMutation({
    mutationFn: () => authService.logout(csrfToken),
    onSuccess: () => queryClient.clear(),
  });
}
