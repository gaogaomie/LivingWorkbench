import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readServerConfig } from "./env";

const serverRoot = fileURLToPath(new URL("../../", import.meta.url));
const manifest = z
  .object({ scripts: z.object({ dev: z.string() }) })
  .parse(JSON.parse(readFileSync(path.join(serverRoot, "package.json"), "utf8")));
const developmentConfigSchema = z.object({ key: z.string().nullable(), model: z.string() });

function readDevelopmentConfig(environment: NodeJS.ProcessEnv = {}) {
  const directory = mkdtempSync(path.join(tmpdir(), "life-env-"));
  const cwd = path.join(directory, "apps/server");
  mkdirSync(cwd, { recursive: true });
  writeFileSync(
    path.join(directory, ".env"),
    "DEEPSEEK_API_KEY=test-key-from-root-env-file\nDEEPSEEK_MODEL=deepseek-test-model\n",
  );
  try {
    const script: string = manifest.scripts.dev;
    const flags = script.split(" ").filter((part) => part.startsWith("--env-file"));
    const output = execFileSync(
      process.execPath,
      [
        ...flags,
        "--import",
        path.join(serverRoot, "node_modules/tsx/dist/loader.mjs"),
        "--input-type=module",
        "--eval",
        `import { readServerConfig } from ${JSON.stringify(path.join(serverRoot, "src/config/env.ts"))}; const config = readServerConfig(); console.log(JSON.stringify({ key: config.deepSeekApiKey, model: config.deepSeekModel }));`,
      ],
      { cwd, env: { PATH: process.env.PATH, NODE_ENV: "test", ...environment }, encoding: "utf8" },
    );
    return developmentConfigSchema.parse(JSON.parse(output));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("development environment", () => {
  it("loads the repository root env file when starting in apps/server", () => {
    expect(readDevelopmentConfig()).toEqual({
      key: "test-key-from-root-env-file",
      model: "deepseek-test-model",
    });
  });

  it("preserves explicitly supplied environment variables", () => {
    expect(readDevelopmentConfig({ DEEPSEEK_API_KEY: "test-key-from-environment" }).key).toBe(
      "test-key-from-environment",
    );
  });

  it("allows an empty optional API key to use local rules", () => {
    expect(readServerConfig({ DEEPSEEK_API_KEY: "  " }).deepSeekApiKey).toBeNull();
  });
});
