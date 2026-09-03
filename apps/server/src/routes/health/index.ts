import {
  createApiFailure,
  createApiSuccess,
  type HealthResponse,
  healthResponseSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync } from "fastify";
import type { DatabaseConnection } from "../../db/client";

interface HealthRoutesOptions {
  database: DatabaseConnection;
}

export const registerHealthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (
  app,
  { database },
) => {
  app.get("/live", async () =>
    createApiSuccess<HealthResponse>(
      healthResponseSchema.parse({
        status: "ok",
        service: "daily-life-server",
        version: "0.1.0",
        checkedAt: new Date().toISOString(),
      }),
    ),
  );

  app.get("/ready", async (_, reply) => {
    try {
      database.sqlite.exec("BEGIN IMMEDIATE; ROLLBACK;");
      return createApiSuccess<HealthResponse>(
        healthResponseSchema.parse({
          status: "ok",
          service: "daily-life-server",
          version: "0.1.0",
          checkedAt: new Date().toISOString(),
        }),
      );
    } catch {
      reply.status(503);
      return createApiFailure(
        "DATABASE_UNAVAILABLE",
        "数据库暂时不可用。",
        healthResponseSchema.parse({
          status: "unavailable",
          service: "daily-life-server",
          version: "0.1.0",
          checkedAt: new Date().toISOString(),
        }),
      );
    }
  });
};
