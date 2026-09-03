import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { readServerConfig, type ServerConfig } from "./config/env";
import { createDatabase, type DatabaseConnection } from "./db/client";
import { migrateDatabase } from "./db/migrate";
import { registerApiResponseGuard } from "./plugins/api-response";
import { registerErrorHandler } from "./plugins/error-handler";
import { SqliteFinanceRepository } from "./repositories/finance.repository";
import {
  FitnessRepository,
  HabitRepository,
  MediaRepository,
  OverviewRepository,
  ShoppingRepository,
  TimelineRepository,
  TodoRepository,
} from "./repositories/life.repository";
import { TrashRepository } from "./repositories/trash.repository";
import { registerAuthRoutes } from "./routes/auth";
import { registerDataRoutes } from "./routes/data";
import { registerFinanceRoutes } from "./routes/finance";
import { registerHealthRoutes } from "./routes/health";
import { registerLifeRoutes } from "./routes/life";
import { registerMediaAssetRoutes } from "./routes/media-assets";
import { AuthService } from "./services/auth.service";
import { DataBackupService } from "./services/data-backup.service";
import { ExcelBackupService } from "./services/excel-backup.service";
import { MediaCoverService } from "./services/media-cover.service";

export interface BuildAppOptions {
  logger?: boolean;
  config?: ServerConfig;
  database?: DatabaseConnection;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? readServerConfig();
  const database = options.database ?? createDatabase(config.databasePath);
  try {
    migrateDatabase(database);
  } catch (error) {
    database.close();
    throw error;
  }
  const authService = new AuthService(database.db, config.sessionTtlDays);
  const mediaCoverService = new MediaCoverService(database.db, config.uploadDirectory);
  const financeRepository = new SqliteFinanceRepository(database.db);
  const habits = new HabitRepository(database.db);
  const todos = new TodoRepository(database.db);
  const timeline = new TimelineRepository(database.db);
  const lifeRepositories = {
    habits,
    fitness: new FitnessRepository(database.db),
    todos,
    shopping: new ShoppingRepository(database.db),
    media: new MediaRepository(database.db),
    timeline,
    overview: new OverviewRepository(financeRepository, habits, todos, timeline),
    trash: new TrashRepository(database.db),
  };

  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: "x-request-id",
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(cookie, { secret: config.sessionSecret });
  await app.register(multipart);
  await app.register(rateLimit, { global: false });

  registerApiResponseGuard(app);
  registerErrorHandler(app);
  await app.register(registerHealthRoutes, { prefix: "/api/v1/health", database });
  await app.register(registerAuthRoutes, {
    prefix: "/api/v1/auth",
    authService,
    config,
  });
  await app.register(registerFinanceRoutes, {
    prefix: "/api/v1/finance",
    authService,
    config,
    financeRepository,
  });
  await app.register(registerDataRoutes, {
    prefix: "/api/v1/data",
    authService,
    config,
    backupService: new ExcelBackupService(
      new DataBackupService(database.db, config.backupDirectory),
      mediaCoverService,
    ),
  });
  await app.register(registerMediaAssetRoutes, {
    prefix: "/api/v1",
    authService,
    config,
    mediaCoverService,
  });
  await app.register(registerLifeRoutes, {
    prefix: "/api/v1",
    authService,
    config,
    ...lifeRepositories,
  });

  app.addHook("onClose", async () => {
    database.close();
  });

  return app;
}
