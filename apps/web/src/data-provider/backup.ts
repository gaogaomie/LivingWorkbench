import type { SessionResponse } from "@daily-life/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { backupService } from "../services/backup.service";
import { queryKeys } from "./query-keys";

export function useBackupMutations() {
  const queryClient = useQueryClient();
  const csrfToken =
    queryClient.getQueryData<SessionResponse>(queryKeys.authSession)?.csrfToken ?? "";
  return {
    exportBackup: useMutation({
      mutationFn: backupService.exportWorkbook,
    }),
    preflight: useMutation({
      mutationFn: backupService.preflight,
    }),
    restore: useMutation({
      mutationFn: (input: { workbookBase64: string; expectedChecksumSha256: string }) =>
        backupService.restore(input, csrfToken),
      onSuccess: () => queryClient.invalidateQueries(),
    }),
  };
}
