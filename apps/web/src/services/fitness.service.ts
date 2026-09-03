import type {
  FitnessLogInput,
  FitnessProfileInput,
  FitnessResponse,
  UpdateFitnessLog,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const fitnessService = {
  get: (today: string) => requestData<FitnessResponse>({ url: "/fitness", params: { today } }),
  saveProfile: (input: FitnessProfileInput, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/fitness/profile",
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  saveLog: (input: FitnessLogInput, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/fitness/logs",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  updateLog: (input: UpdateFitnessLog & { id: string }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/fitness/logs/${input.id}`,
      method: "PATCH",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
};
