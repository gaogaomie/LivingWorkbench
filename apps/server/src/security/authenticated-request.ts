import { createApiFailure } from "@daily-life/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../config/env";
import type { AuthenticatedSession, AuthService } from "../services/auth.service";

export const SESSION_COOKIE_NAME = "daily_life_session";

export function readAuthenticatedSession(
  request: FastifyRequest,
  authService: AuthService,
): AuthenticatedSession | null {
  const signedToken = request.cookies[SESSION_COOKIE_NAME];
  if (!signedToken) {
    return null;
  }

  const unsigned = request.unsignCookie(signedToken);
  return unsigned.valid && unsigned.value ? authService.getSession(unsigned.value) : null;
}

export function rejectRequest(
  reply: FastifyReply,
  code: string,
  message: string,
  statusCode: number,
) {
  return reply
    .status(statusCode)
    .send(createApiFailure(code, message, { requestId: reply.request.id }));
}

export function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AuthService,
): AuthenticatedSession | null {
  const session = readAuthenticatedSession(request, authService);
  if (!session) {
    rejectRequest(reply, "UNAUTHENTICATED", "登录状态已失效，请重新登录。", 401);
  }
  return session;
}

export function verifyMutationRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  session: AuthenticatedSession,
  authService: AuthService,
  config: ServerConfig,
): boolean {
  const origin = request.headers.origin;
  if (origin && origin !== config.appOrigin) {
    rejectRequest(reply, "FORBIDDEN", "请求来源无效。", 403);
    return false;
  }

  const csrfToken = request.headers["x-csrf-token"];
  if (typeof csrfToken !== "string" || !authService.verifyCsrf(session, csrfToken)) {
    rejectRequest(reply, "FORBIDDEN", "安全校验已过期，请刷新后重试。", 403);
    return false;
  }

  return true;
}
