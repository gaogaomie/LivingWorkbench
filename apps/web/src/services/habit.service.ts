import type { CreateHabit, HabitDayResponse, UpdateHabit } from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const habitService = {
  getDay: (date: string) => requestData<HabitDayResponse>({ url: "/habits", params: { date } }),
  create: (input: CreateHabit, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/habits",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  update: (input: UpdateHabit & { id: string }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/habits/${input.id}`,
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  setProgress: (input: { id: string; value: number; date: string }, csrfToken: string) =>
    requestData<{ saved: true }>({
      url: `/habits/${input.id}/progress`,
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: { date: input.date, value: input.value },
    }),
  setStatus: (input: { id: string; status: "active" | "paused" | "archived" }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/habits/${input.id}/status`,
      method: "PATCH",
      headers: csrfHeaders(csrfToken),
      data: { status: input.status },
    }),
};
