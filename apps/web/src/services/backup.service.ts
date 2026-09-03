import type { RestorePreflightResponse } from "@daily-life/shared";
import { csrfHeaders, downloadFile, requestData } from "./http-client";

export const backupService = {
  exportWorkbook: () => downloadFile("/data/export.xlsx"),
  preflight: (workbookBase64: string) =>
    requestData<RestorePreflightResponse>({
      url: "/data/restore/preflight",
      method: "POST",
      data: { workbookBase64 },
    }),
  restore: (input: { workbookBase64: string; expectedChecksumSha256: string }, csrfToken: string) =>
    requestData<{ restored: true }>({
      url: "/data/restore",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: input,
    }),
};
