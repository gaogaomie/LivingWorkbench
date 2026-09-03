import type {
  AccountListResponse,
  AccountSummary,
  CreateMemberAccountRequest,
} from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const adminAccountService = {
  list: () => requestData<AccountListResponse>({ url: "/admin/users" }),
  create: (input: CreateMemberAccountRequest, csrfToken: string) =>
    requestData<AccountSummary>({
      url: "/admin/users",
      method: "POST",
      data: input,
      headers: csrfHeaders(csrfToken),
    }),
};
