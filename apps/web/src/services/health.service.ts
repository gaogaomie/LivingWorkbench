import { healthResponseSchema } from "@daily-life/shared";
import { requestData } from "./http-client";

export const healthService = {
  async getReadyState() {
    return healthResponseSchema.parse(
      await requestData<Record<string, unknown>>({ url: "/health/ready" }),
    );
  },
};
