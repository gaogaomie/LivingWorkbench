import type {
  OverviewResponse,
  TimelineResponse,
  TimelineSource,
  TrashResponse,
  TrashSource,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const lifeArchiveService = {
  getTimeline: (
    filters: {
      from?: string | undefined;
      to?: string | undefined;
      source?: TimelineSource | undefined;
      keyword?: string | undefined;
    },
    cursor: string,
  ) =>
    requestData<TimelineResponse>({
      url: "/timeline",
      params: { limit: 20, ...filters, cursor: cursor || undefined },
    }),
  getOverview: (date: string) =>
    requestData<OverviewResponse>({ url: "/overview", params: { date } }),
  getTrash: () => requestData<TrashResponse>({ url: "/trash" }),
  removeTrash: (
    input: { source: TrashSource; id: string; expectedUpdatedAt: string },
    csrfToken: string,
  ) =>
    requestData<null>({
      url: `/trash/${input.source}/${input.id}`,
      method: "DELETE",
      headers: csrfHeaders(csrfToken),
      data: { expectedUpdatedAt: input.expectedUpdatedAt },
    }),
  restoreTrash: (
    input: { source: TrashSource; id: string; expectedDeletedAt: string },
    csrfToken: string,
  ) =>
    requestData<{ restored: true }>({
      url: `/trash/${input.source}/${input.id}/restore`,
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: { expectedDeletedAt: input.expectedDeletedAt },
    }),
};
