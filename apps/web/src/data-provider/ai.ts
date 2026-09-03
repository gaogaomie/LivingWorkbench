import type { GenerateAiSummaryRequest, SessionResponse } from "@daily-life/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiSummaryService } from "@/services/ai-summary.service";
import { queryKeys } from "./query-keys";

export function useGenerateAiSummary() {
  const queryClient = useQueryClient();
  const csrfToken =
    queryClient.getQueryData<SessionResponse>(queryKeys.authSession)?.csrfToken ?? "";

  return useMutation({
    mutationFn: (request: GenerateAiSummaryRequest) =>
      aiSummaryService.generate(request, csrfToken),
  });
}
