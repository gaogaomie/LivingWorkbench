import {
  aiSummaryResponseSchema,
  createApiSuccess,
  generateAiSummaryRequestSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../../config/env";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AiSummaryService } from "../../services/ai-summary.service";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";

interface AiRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
  aiSummaryService: AiSummaryService;
}

function requireMutation(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AuthService,
  config: ServerConfig,
): AuthenticatedSession | null {
  const session = requireSession(request, reply, authService);
  if (!session) return null;
  return verifyMutationRequest(request, reply, session, authService, config) ? session : null;
}

export const registerAiRoutes: FastifyPluginAsync<AiRoutesOptions> = async (
  app,
  { authService, config, aiSummaryService },
) => {
  app.post(
    "/summaries",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const session = requireMutation(request, reply, authService, config);
      const body = generateAiSummaryRequestSchema.safeParse(request.body);
      if (!session) return;
      if (!body.success) {
        return rejectRequest(
          reply,
          "AI_CONSENT_REQUIRED",
          "生成 AI 总结前，请明确同意发送本次摘要所需的记录。",
          400,
        );
      }
      const result = await aiSummaryService.generate({ userId: session.user.id, ...body.data });
      if (result.providerFailure) {
        request.log.warn(
          { event: "ai_summary_fallback", requestId: request.id, module: "ai-summary" },
          "AI provider unavailable; deterministic fallback used",
        );
      }
      return createApiSuccess(aiSummaryResponseSchema.parse(result.response));
    },
  );
};
