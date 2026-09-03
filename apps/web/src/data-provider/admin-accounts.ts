import type { CreateMemberAccountRequest } from "@daily-life/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAccountService } from "@/services/admin-account.service";
import { queryKeys } from "./query-keys";

export function useAdminAccounts(isEnabled: boolean) {
  return useQuery({
    queryKey: queryKeys.adminAccounts,
    queryFn: adminAccountService.list,
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

export function useCreateMemberAccount(csrfToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMemberAccountRequest) => adminAccountService.create(input, csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminAccounts });
    },
  });
}
