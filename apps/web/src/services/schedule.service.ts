import type {
  CreateTodo,
  DueRemindersResponse,
  ScheduleResponse,
  TodoStatus,
  UpdateTodo,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const scheduleService = {
  get: (today: string) => requestData<ScheduleResponse>({ url: "/schedule", params: { today } }),
  getDueReminders: (from: string, to: string) =>
    requestData<DueRemindersResponse>({ url: "/schedule/reminders/due", params: { from, to } }),
  create: (input: CreateTodo, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/schedule/todos",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  update: (input: UpdateTodo & { id: string }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/schedule/todos/${input.id}`,
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  setStatus: (input: { id: string; status: TodoStatus }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/schedule/todos/${input.id}/status`,
      method: "PATCH",
      headers: csrfHeaders(csrfToken),
      data: { status: input.status },
    }),
};
