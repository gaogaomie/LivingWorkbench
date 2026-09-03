import type {
  CreateFinanceEntry,
  FinanceEntry,
  FinanceMonthResponse,
  SetMonthlyBudget,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const financeService = {
  getMonth: (month: string) =>
    requestData<FinanceMonthResponse>({
      url: "/finance",
      params: { month },
    }),
  createEntry: (entry: CreateFinanceEntry, csrfToken: string) =>
    requestData<{ entry: FinanceEntry; idempotentReplay: boolean }>({
      url: "/finance/entries",
      method: "POST",
      headers: csrfHeaders(csrfToken),
      data: entry,
    }),
  setBudget: (budget: SetMonthlyBudget, csrfToken: string) =>
    requestData<{ month: string; amountFen: number }>({
      url: "/finance/budget",
      method: "PUT",
      headers: csrfHeaders(csrfToken),
      data: budget,
    }),
  deleteEntry: (entry: FinanceEntry, csrfToken: string) =>
    requestData<null>({
      url: `/finance/entries/${entry.id}`,
      method: "DELETE",
      headers: csrfHeaders(csrfToken),
      data: { expectedUpdatedAt: entry.updatedAt },
    }),
};
