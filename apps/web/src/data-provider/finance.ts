import type {
  CreateFinanceEntry,
  FinanceEntry,
  SessionResponse,
  SetMonthlyBudget,
} from "@daily-life/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "../services/finance.service";
import { queryKeys } from "./query-keys";

export function useFinanceMonth(month: string) {
  return useQuery({
    queryKey: queryKeys.financeMonth(month),
    queryFn: () => financeService.getMonth(month),
  });
}

function useCsrfToken(): string {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<SessionResponse>(queryKeys.authSession)?.csrfToken ?? "";
}

export function useCreateFinanceEntry(month: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  return useMutation({
    mutationFn: (entry: CreateFinanceEntry) => financeService.createEntry(entry, csrfToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.financeMonth(month) }),
        queryClient.invalidateQueries({ queryKey: ["overview"] }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
    },
  });
}

export function useSetMonthlyBudget(month: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  return useMutation({
    mutationFn: (budget: SetMonthlyBudget) => financeService.setBudget(budget, csrfToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financeMonth(month) }),
  });
}

export function useDeleteFinanceEntry(month: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  return useMutation({
    mutationFn: (entry: FinanceEntry) => financeService.deleteEntry(entry, csrfToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.financeMonth(month) }),
  });
}
