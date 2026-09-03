import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "../../data/daily-life.sqlite",
  },
  strict: true,
  verbose: true,
});
