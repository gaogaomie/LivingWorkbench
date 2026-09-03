import type { AiSummaryResponse, GenerateAiSummaryRequest } from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const aiSummaryService = {
  generate: (request: GenerateAiSummaryRequest, csrfToken: string) =>
    requestData<AiSummaryResponse>({
      url: "/ai/summaries",
      method: "POST",
      data: request,
      headers: csrfHeaders(csrfToken),
    }),
};
