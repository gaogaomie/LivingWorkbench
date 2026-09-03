import { loginRequestSchema } from "@daily-life/shared";
import { readServerConfig } from "../config/env";
import { createDatabase } from "../db/client";
import { runMigrations } from "../db/migrate";
import { AuthService } from "../services/auth.service";

const config = readServerConfig();
const parsed = loginRequestSchema.safeParse({
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
});

if (!parsed.success) {
  throw new Error(
    "请通过 ADMIN_USERNAME 和 ADMIN_PASSWORD 环境变量提供新的管理员凭据，密码至少 8 位。",
  );
}

runMigrations(config.databasePath);
const database = createDatabase(config.databasePath);

try {
  const authService = new AuthService(database.db, config.sessionTtlDays);
  const admin = await authService.resetAdminCredentials(parsed.data.username, parsed.data.password);
  process.stdout.write(`管理员已重置为 ${admin.username}，现有登录会话已失效。\n`);
} finally {
  database.close();
}
