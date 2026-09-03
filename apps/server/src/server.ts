import { buildApp } from "./app";
import { readServerConfig } from "./config/env";

const config = readServerConfig();
const app = await buildApp();

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, "server shutdown requested");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
