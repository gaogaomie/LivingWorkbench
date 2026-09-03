import type { LoginRequest, SessionResponse } from "@daily-life/shared";
import { csrfHeaders, requestData } from "./http-client";

export const authService = {
  getSession: () => requestData<SessionResponse>({ url: "/auth/session" }),
  login: (credentials: LoginRequest) =>
    requestData<SessionResponse>({ url: "/auth/login", method: "POST", data: credentials }),
  logout: (csrfToken: string) =>
    requestData<null>({
      url: "/auth/logout",
      method: "POST",
      headers: csrfHeaders(csrfToken),
    }),
};
