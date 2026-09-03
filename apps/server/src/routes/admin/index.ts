import {
  accountListResponseSchema,
  accountSummarySchema,
  createApiSuccess,
  createMemberAccountRequestSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../../config/env";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";

interface AdminRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
}

function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AuthService,
): AuthenticatedSession | null {
  const session = requireSession(request, reply, authService);
  if (!session) {
    return null;
  }
  if (session.user.role !== "admin") {
    rejectRequest(reply, "FORBIDDEN", "只有管理员可以管理账号。", 403);
    return null;
  }
  return session;
}

export const registerAdminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (
  app,
  { authService, config },
) => {
  app.get("/users", async (request, reply) => {
    if (!requireAdmin(request, reply, authService)) {
      return;
    }

    return createApiSuccess(accountListResponseSchema.parse({ items: authService.listAccounts() }));
  });

  app.post(
    "/users",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const session = requireAdmin(request, reply, authService);
      if (!session) {
        return;
      }
      if (!verifyMutationRequest(request, reply, session, authService, config)) {
        return;
      }

      const parsed = createMemberAccountRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return rejectRequest(reply, "VALIDATION_ERROR", "请检查用户名和初始密码。", 400);
      }

      const result = await authService.createMemberAccount(
        parsed.data.username,
        parsed.data.password,
      );
      if (result.status === "conflict") {
        return rejectRequest(reply, "CONFLICT", "这个用户名已经被使用。", 409);
      }

      request.log.info(
        { actorUserId: session.user.id, targetUserId: result.account.id },
        "admin account created",
      );
      return reply.status(201).send(createApiSuccess(accountSummarySchema.parse(result.account)));
    },
  );
};
