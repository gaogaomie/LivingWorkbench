import path from "node:path";
import { z } from "zod";

const serverConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().int().min(1).max(65_535).default(8787),
  appOrigin: z.url().default("http://localhost:5173"),
  databasePath: z.string().min(1).default("../../data/daily-life.sqlite"),
  backupDirectory: z.string().min(1).default("../../data/backups"),
  uploadDirectory: z.string().min(1).default("../../uploads"),
  sessionSecret: z.string().min(32).default("development-only-session-secret-change-me"),
  sessionTtlDays: z.coerce.number().int().min(1).max(365).default(30),
  deepSeekApiKey: z.string().min(20).nullable().default(null),
  deepSeekModel: z.string().min(1).default("deepseek-v4-pro"),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
});

export interface ServerConfig {
  host: string;
  port: number;
  appOrigin: string;
  databasePath: string;
  backupDirectory: string | null;
  uploadDirectory: string | null;
  sessionSecret: string;
  sessionTtlDays: number;
  deepSeekApiKey: string | null;
  deepSeekModel: string;
  nodeEnv: "development" | "test" | "production";
  cookieSecure: boolean;
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = serverConfigSchema.parse({
    host: env.HOST,
    port: env.PORT,
    appOrigin: env.APP_ORIGIN,
    databasePath: env.DATABASE_PATH,
    backupDirectory: env.BACKUP_DIRECTORY,
    uploadDirectory: env.UPLOAD_DIR,
    sessionSecret: env.SESSION_SECRET,
    sessionTtlDays: env.SESSION_TTL_DAYS,
    deepSeekApiKey: env.DEEPSEEK_API_KEY?.trim() || null,
    deepSeekModel: env.DEEPSEEK_MODEL,
    nodeEnv: env.NODE_ENV,
  });

  if (
    parsed.nodeEnv === "production" &&
    parsed.sessionSecret === "development-only-session-secret-change-me"
  ) {
    throw new Error("Production requires an explicit SESSION_SECRET");
  }

  return {
    ...parsed,
    databasePath:
      parsed.databasePath === ":memory:"
        ? parsed.databasePath
        : path.resolve(process.cwd(), parsed.databasePath),
    backupDirectory: path.resolve(process.cwd(), parsed.backupDirectory),
    uploadDirectory: path.resolve(process.cwd(), parsed.uploadDirectory),
    cookieSecure: new URL(parsed.appOrigin).protocol === "https:",
  };
}
