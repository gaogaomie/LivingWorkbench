import { timingSafeEqual } from "node:crypto";
import path from "node:path";
import { createApiFailure } from "@daily-life/shared";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import type { AiSummaryProvider } from "../../server/src/ai/ai-summary.provider";
import { DeepSeekSummaryProvider } from "../../server/src/ai/deepseek-summary.provider";
import { buildApp } from "../../server/src/app";
import type { ServerConfig } from "../../server/src/config/env";
import { createDatabase } from "../../server/src/db/client";
import { migrateDatabase } from "../../server/src/db/migrate";
import { AuthService } from "../../server/src/services/auth.service";
import type { DesktopSettings } from "./contracts";

export function hasDesktopToken(value: unknown, token: string): boolean {
  if (typeof value !== "string") return false;
  const received = Buffer.from(value);
  const expected = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

class ConfigurableSummaryProvider implements AiSummaryProvider {
  readonly kind = "deepseek" as const;
  constructor(private settings: DesktopSettings) {}
  update(settings: DesktopSettings) {
    this.settings = settings;
  }
  async generate(input: Parameters<AiSummaryProvider["generate"]>[0]) {
    if (!this.settings.deepSeekApiKey) throw new Error("DESKTOP_AI_NOT_CONFIGURED");
    return new DeepSeekSummaryProvider(
      this.settings.deepSeekApiKey,
      this.settings.deepSeekModel,
    ).generate(input);
  }
}

export async function createLocalServer(input: {
  directory: string;
  webRoot: string;
  token: string;
  settings: DesktopSettings;
}) {
  const storage = path.join(input.directory, "storage");
  const config: ServerConfig = {
    host: "127.0.0.1",
    port: 0,
    appOrigin: "http://127.0.0.1",
    databasePath: path.join(storage, "daily-life.sqlite"),
    uploadDirectory: path.join(storage, "uploads"),
    backupDirectory: path.join(storage, "backups"),
    sessionSecret: input.settings.sessionSecret,
    sessionTtlDays: 30,
    deepSeekApiKey: input.settings.deepSeekApiKey,
    deepSeekModel: input.settings.deepSeekModel,
    nodeEnv: "production",
    cookieSecure: false,
  };
  const database = createDatabase(config.databasePath);
  migrateDatabase(database);
  const auth = new AuthService(database.db, config.sessionTtlDays);
  const provider = new ConfigurableSummaryProvider(input.settings);
  const server = await buildApp({ config, database, aiSummaryProvider: provider });
  server.addHook("onRequest", async (request, reply) => {
    if (!hasDesktopToken(request.headers["x-daily-life-desktop"], input.token)) {
      return reply.code(403).send(createApiFailure("FORBIDDEN", "仅允许桌面应用访问。", null));
    }
  });
  server.addHook("onSend", async (_request, reply, payload) => {
    if (String(reply.getHeader("content-type")).startsWith("text/html")) {
      reply.header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      );
    }
    return payload;
  });
  await registerDesktopFiles(server, input.webRoot);
  return {
    server,
    needsSetup: () => auth.listAccounts().length === 0,
    setup: (account: { username: string; password: string }) =>
      auth.initializeAdmin(account.username, account.password),
    updateSettings: (settings: DesktopSettings) => provider.update(settings),
    async listen() {
      const origin = await server.listen({ host: config.host, port: 0 });
      config.appOrigin = origin;
      return origin;
    },
  };
}

async function registerDesktopFiles(server: FastifyInstance, webRoot: string) {
  await server.register(async (files) => {
    await files.register(fastifyStatic, {
      root: webRoot,
      wildcard: false,
      etag: false,
      lastModified: false,
      cacheControl: false,
    });
    files.get("/*", (request, reply) => {
      if (
        request.method === "GET" &&
        !request.url.startsWith("/api/") &&
        !path.extname(request.url.split("?")[0] ?? "")
      ) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send(createApiFailure("NOT_FOUND", "未找到请求的内容。", null));
    });
  });
}
