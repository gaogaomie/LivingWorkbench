import {
  createApiSuccess,
  loginRequestSchema,
  type SessionResponse,
  sessionResponseSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync } from "fastify";
import type { ServerConfig } from "../../config/env";
import {
  readAuthenticatedSession,
  rejectRequest,
  SESSION_COOKIE_NAME,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthService } from "../../services/auth.service";

interface AuthRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
}

export const registerAuthRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  app,
  { authService, config },
) => {
  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const origin = request.headers.origin;
      if (origin && origin !== config.appOrigin) {
        return rejectRequest(reply, "FORBIDDEN", "请求来源无效。", 403);
      }

      const parsed = loginRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return rejectRequest(reply, "VALIDATION_ERROR", "请检查用户名和密码。", 400);
      }

      const result = await authService.login(parsed.data.username, parsed.data.password);
      if (!result) {
        return rejectRequest(reply, "UNAUTHENTICATED", "用户名或密码不正确。", 401);
      }

      reply.setCookie(SESSION_COOKIE_NAME, result.sessionToken, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: config.cookieSecure,
        signed: true,
        maxAge: config.sessionTtlDays * 86_400,
      });

      const payload: SessionResponse = {
        user: result.session.user,
        csrfToken: result.csrfToken,
        expiresAt: result.session.expiresAt,
      };
      return createApiSuccess(sessionResponseSchema.parse(payload));
    },
  );

  app.get("/session", async (request, reply) => {
    const session = readAuthenticatedSession(request, authService);
    if (!session) {
      return rejectRequest(reply, "UNAUTHENTICATED", "登录状态已失效，请重新登录。", 401);
    }

    const payload: SessionResponse = {
      user: session.user,
      csrfToken: authService.rotateCsrfToken(session.sessionIdHash),
      expiresAt: session.expiresAt,
    };
    return createApiSuccess(sessionResponseSchema.parse(payload));
  });

  app.post("/logout", async (request, reply) => {
    const session = readAuthenticatedSession(request, authService);
    if (!session) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return createApiSuccess(null);
    }

    if (!verifyMutationRequest(request, reply, session, authService, config)) {
      return;
    }

    authService.revokeSession(session.sessionIdHash);
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return createApiSuccess(null);
  });
};
