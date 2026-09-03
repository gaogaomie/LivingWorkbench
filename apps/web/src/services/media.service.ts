import type { CreateMediaItem, EditMediaItem, MediaResponse } from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export interface MediaCoverData {
  mimeType: string;
  contentBase64: string;
  etag: string;
}

export const mediaService = {
  get: (year: string) => requestData<MediaResponse>({ url: "/media-items", params: { year } }),
  getCover: (assetId: string) => requestData<MediaCoverData>({ url: `/media-assets/${assetId}` }),
  create: (input: CreateMediaItem, csrfToken: string) =>
    requestData<{ id: string }>({
      url: "/media-items",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  edit: (input: EditMediaItem & { id: string }, csrfToken: string) =>
    requestData<{ updated: true }>({
      url: `/media-items/${input.id}`,
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  updateStatus: (
    input: {
      id: string;
      status: "wishlist" | "in_progress" | "completed" | "paused";
      rating: number | null;
      completedOn: string | null;
    },
    csrfToken: string,
  ) =>
    requestData<{ updated: true }>({
      url: `/media-items/${input.id}`,
      method: "PATCH",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
  uploadCover: (input: { id: string; file: File }, csrfToken: string) => {
    const data = new FormData();
    data.append("cover", input.file);
    return requestData<{ assetId: string }>({
      url: `/media-items/${input.id}/cover`,
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data,
    });
  },
  removeCover: (id: string, csrfToken: string) =>
    requestData<null>({
      url: `/media-items/${id}/cover`,
      method: "DELETE",
      headers: csrfHeaders(csrfToken),
    }),
};
