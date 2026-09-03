import {
  createApiSuccess,
  createFinanceEntrySchema,
  deleteFinanceEntrySchema,
  financeEntrySchema,
  financeMonthResponseSchema,
  setMonthlyBudgetSchema,
  updateFinanceEntrySchema,
  yearMonthSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ServerConfig } from "../../config/env";
import type { FinanceRepository } from "../../repositories/finance.repository";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";

interface FinanceRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
  financeRepository: FinanceRepository;
}

const idParamsSchema = z.object({ id: z.string().uuid() });
const monthQuerySchema = z.object({ month: yearMonthSchema });

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

function rejectValidation(reply: FastifyReply) {
  return rejectRequest(reply, "VALIDATION_ERROR", "请检查提交的数据。", 400);
}

function rejectWriteStatus(reply: FastifyReply, status: "not_found" | "conflict") {
  return status === "not_found"
    ? rejectRequest(reply, "NOT_FOUND", "没有找到这条账目。", 404)
    : rejectRequest(reply, "CONFLICT", "账目已在其他位置更新，请刷新后重试。", 409);
}

export const registerFinanceRoutes: FastifyPluginAsync<FinanceRoutesOptions> = async (
  app,
  { authService, config, financeRepository },
) => {
  app.get("/", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    if (!session) return;
    const query = monthQuerySchema.safeParse(request.query);
    if (!query.success) return rejectValidation(reply);

    return createApiSuccess(
      financeMonthResponseSchema.parse(
        financeRepository.getMonth(session.user.id, query.data.month),
      ),
    );
  });

  app.post("/entries", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    if (!session) return;
    const body = createFinanceEntrySchema.safeParse(request.body);
    if (!body.success) return rejectValidation(reply);

    const result = financeRepository.createEntry(session.user.id, body.data);
    if (!("value" in result)) {
      return rejectWriteStatus(reply, result.status);
    }

    return reply.status(result.status === "created" ? 201 : 200).send(
      createApiSuccess({
        entry: financeEntrySchema.parse(result.value),
        idempotentReplay: result.status === "replayed",
      }),
    );
  });

  app.patch("/entries/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    if (!session) return;
    const params = idParamsSchema.safeParse(request.params);
    const body = updateFinanceEntrySchema.safeParse(request.body);
    if (!params.success || !body.success) return rejectValidation(reply);

    const result = financeRepository.updateEntry(session.user.id, params.data.id, body.data);
    if (!("value" in result)) {
      return rejectWriteStatus(reply, result.status);
    }
    return createApiSuccess(financeEntrySchema.parse(result.value));
  });

  app.delete("/entries/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    if (!session) return;
    const params = idParamsSchema.safeParse(request.params);
    const body = deleteFinanceEntrySchema.safeParse(request.body);
    if (!params.success || !body.success) return rejectValidation(reply);

    const result = financeRepository.deleteEntry(
      session.user.id,
      params.data.id,
      body.data.expectedUpdatedAt,
    );
    if (result !== "deleted") return rejectWriteStatus(reply, result);
    return createApiSuccess(null);
  });

  app.put("/budget", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    if (!session) return;
    const body = setMonthlyBudgetSchema.safeParse(request.body);
    if (!body.success) return rejectValidation(reply);

    const amountFen = financeRepository.setBudget(session.user.id, body.data);
    return createApiSuccess({ month: body.data.month, amountFen });
  });
};
