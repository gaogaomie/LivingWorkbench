import {
  createApiSuccess,
  createHabitSchema,
  createMediaItemSchema,
  createShoppingItemSchema,
  createTodoSchema,
  deleteRecordSchema,
  dueReminderQuerySchema,
  dueRemindersResponseSchema,
  editMediaItemSchema,
  fitnessLogInputSchema,
  fitnessProfileInputSchema,
  fitnessResponseSchema,
  habitDayResponseSchema,
  localDateSchema,
  mediaResponseSchema,
  overviewResponseSchema,
  purchaseShoppingItemSchema,
  recordHabitProgressSchema,
  restoreRecordSchema,
  scheduleResponseSchema,
  shoppingResponseSchema,
  timelineResponseSchema,
  timelineSourceSchema,
  trashResponseSchema,
  trashSourceSchema,
  updateFitnessLogSchema,
  updateHabitSchema,
  updateHabitStatusSchema,
  updateMediaItemSchema,
  updateShoppingItemSchema,
  updateTodoSchema,
  updateTodoStatusSchema,
  yearMonthSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ServerConfig } from "../../config/env";
import type {
  FitnessRepository,
  HabitRepository,
  LifeWriteResult,
  MediaRepository,
  OverviewRepository,
  ShoppingRepository,
  TimelineRepository,
  TodoRepository,
} from "../../repositories/life.repository";
import type { TrashRepository, TrashWriteResult } from "../../repositories/trash.repository";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";

interface LifeRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
  habits: HabitRepository;
  fitness: FitnessRepository;
  todos: TodoRepository;
  shopping: ShoppingRepository;
  media: MediaRepository;
  timeline: TimelineRepository;
  overview: OverviewRepository;
  trash: TrashRepository;
}

const idParamsSchema = z.object({ id: z.string().uuid() });
const trashParamsSchema = z.object({ type: trashSourceSchema, id: z.string().uuid() });
const dateQuerySchema = z.object({ date: localDateSchema });
const todayQuerySchema = z.object({ today: localDateSchema });
const monthQuerySchema = z.object({ month: yearMonthSchema });
const yearQuerySchema = z.object({ year: z.string().regex(/^\d{4}$/) });
const timelineQuerySchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  source: timelineSourceSchema.optional(),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

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

function badRequest(reply: FastifyReply) {
  return rejectRequest(reply, "VALIDATION_ERROR", "请检查提交的数据。", 400);
}

function notFound(reply: FastifyReply) {
  return rejectRequest(reply, "NOT_FOUND", "没有找到对应记录。", 404);
}

function rejectTrashWrite(reply: FastifyReply, result: TrashWriteResult) {
  return result === "conflict"
    ? rejectRequest(reply, "CONFLICT", "记录已在其他页面发生变化，请刷新后重试。", 409)
    : notFound(reply);
}

function rejectLifeWrite(reply: FastifyReply, result: LifeWriteResult) {
  return result === "conflict"
    ? rejectRequest(reply, "CONFLICT", "记录已在其他页面更新，请刷新后重试。", 409)
    : notFound(reply);
}

export const registerLifeRoutes: FastifyPluginAsync<LifeRoutesOptions> = async (
  app,
  { authService, config, habits, fitness, todos, shopping, media, timeline, overview, trash },
) => {
  app.get("/overview", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = dateQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      overviewResponseSchema.parse(overview.get(session.user.id, query.data.date)),
    );
  });
  app.get("/trash", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    if (!session) return;
    return createApiSuccess(trashResponseSchema.parse({ items: trash.list(session.user.id) }));
  });
  app.delete("/trash/:type/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = trashParamsSchema.safeParse(request.params);
    const body = deleteRecordSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = trash.delete(
      session.user.id,
      params.data.type,
      params.data.id,
      body.data.expectedUpdatedAt,
    );
    return result === "deleted" ? createApiSuccess(null) : rejectTrashWrite(reply, result);
  });
  app.post("/trash/:type/:id/restore", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = trashParamsSchema.safeParse(request.params);
    const body = restoreRecordSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = trash.restore(
      session.user.id,
      params.data.type,
      params.data.id,
      body.data.expectedDeletedAt,
    );
    return result === "restored"
      ? createApiSuccess({ restored: true as const })
      : rejectTrashWrite(reply, result);
  });
  app.get("/habits", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = dateQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      habitDayResponseSchema.parse(habits.getDay(session.user.id, query.data.date)),
    );
  });
  app.post("/habits", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = createHabitSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    habits.create(session.user.id, body.data);
    return reply.status(201).send(createApiSuccess({ id: body.data.id }));
  });
  app.put("/habits/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateHabitSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = habits.update(session.user.id, params.data.id, body.data);
    return result === "updated"
      ? createApiSuccess({ updated: true as const })
      : rejectLifeWrite(reply, result);
  });
  app.put("/habits/:id/progress", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = recordHabitProgressSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    return habits.recordProgress(session.user.id, params.data.id, body.data.date, body.data.value)
      ? createApiSuccess({ saved: true as const })
      : notFound(reply);
  });
  app.patch("/habits/:id/status", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateHabitStatusSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    return habits.updateStatus(session.user.id, params.data.id, body.data.status)
      ? createApiSuccess({ updated: true as const })
      : notFound(reply);
  });

  app.get("/fitness", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = todayQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      fitnessResponseSchema.parse(fitness.get(session.user.id, query.data.today)),
    );
  });
  app.put("/fitness/profile", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = fitnessProfileInputSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    const saved = fitness.saveProfile(session.user.id, body.data);
    return createApiSuccess({ id: saved.id });
  });
  app.post("/fitness/logs", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = fitnessLogInputSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    const saved = fitness.saveLog(session.user.id, body.data);
    return reply.status(201).send(createApiSuccess({ id: saved.id }));
  });
  app.patch("/fitness/logs/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateFitnessLogSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = fitness.updateLog(session.user.id, params.data.id, body.data);
    return result === "updated"
      ? createApiSuccess({ updated: true as const })
      : rejectLifeWrite(reply, result);
  });

  app.get("/schedule", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = todayQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      scheduleResponseSchema.parse(todos.get(session.user.id, query.data.today)),
    );
  });
  app.get("/schedule/reminders/due", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = dueReminderQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      dueRemindersResponseSchema.parse({
        items: todos.getDueReminders(session.user.id, query.data.from, query.data.to),
      }),
    );
  });
  app.post("/schedule/todos", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = createTodoSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    return todos.create(session.user.id, body.data)
      ? reply.status(201).send(createApiSuccess({ id: body.data.id }))
      : badRequest(reply);
  });
  app.put("/schedule/todos/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateTodoSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = todos.update(session.user.id, params.data.id, body.data);
    return result === "updated"
      ? createApiSuccess({ updated: true as const })
      : rejectLifeWrite(reply, result);
  });
  app.patch("/schedule/todos/:id/status", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateTodoStatusSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    return todos.updateStatus(session.user.id, params.data.id, body.data.status)
      ? createApiSuccess({ updated: true as const })
      : notFound(reply);
  });

  app.get("/shopping", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = monthQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      shoppingResponseSchema.parse(shopping.get(session.user.id, query.data.month)),
    );
  });
  app.post("/shopping/items", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = createShoppingItemSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    shopping.create(session.user.id, body.data);
    return reply.status(201).send(createApiSuccess({ id: body.data.id }));
  });
  app.put("/shopping/items/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateShoppingItemSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = shopping.update(session.user.id, params.data.id, body.data);
    return result === "updated"
      ? createApiSuccess({ updated: true as const })
      : rejectLifeWrite(reply, result);
  });
  app.patch("/shopping/items/:id/status", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = purchaseShoppingItemSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    return shopping.updateStatus(
      session.user.id,
      params.data.id,
      body.data.status,
      body.data.actualUnitPriceFen,
      body.data.purchasedOn,
    )
      ? createApiSuccess({ updated: true as const })
      : notFound(reply);
  });

  app.get("/media-items", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = yearQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(mediaResponseSchema.parse(media.get(session.user.id, query.data.year)));
  });
  app.post("/media-items", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = createMediaItemSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return badRequest(reply);
    media.create(session.user.id, body.data);
    return reply.status(201).send(createApiSuccess({ id: body.data.id }));
  });
  app.put("/media-items/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = editMediaItemSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    const result = media.edit(session.user.id, params.data.id, body.data);
    return result === "updated"
      ? createApiSuccess({ updated: true as const })
      : rejectLifeWrite(reply, result);
  });
  app.patch("/media-items/:id", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    const body = updateMediaItemSchema.safeParse(request.body);
    if (!session) return;
    if (!params.success || !body.success) return badRequest(reply);
    return media.update(session.user.id, params.data.id, body.data)
      ? createApiSuccess({ updated: true as const })
      : notFound(reply);
  });

  app.get("/timeline", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const query = timelineQuerySchema.safeParse(request.query);
    if (!session) return;
    if (!query.success) return badRequest(reply);
    return createApiSuccess(
      timelineResponseSchema.parse(timeline.getPage(session.user.id, query.data)),
    );
  });
};
