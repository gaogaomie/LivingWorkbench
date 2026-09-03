import type { ServerConfig } from "../config/env";

export const testServerConfig: ServerConfig = {
  host: "127.0.0.1",
  port: 8787,
  appOrigin: "http://localhost:5173",
  databasePath: ":memory:",
  backupDirectory: null,
  uploadDirectory: null,
  sessionSecret: "test-session-secret-that-is-long-enough",
  sessionTtlDays: 30,
  deepSeekApiKey: null,
  deepSeekModel: "deepseek-test-model",
  nodeEnv: "test",
  cookieSecure: false,
};
