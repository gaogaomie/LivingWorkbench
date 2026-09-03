import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const serverSourceRoot = path.join(workspaceRoot, "apps/server/src");

interface ConventionRule {
  description: string;
  pattern: RegExp;
  appliesTo: (relativePath: string) => boolean;
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    if (statSync(absolutePath).isDirectory()) return listTypeScriptFiles(absolutePath);
    return entry.endsWith(".ts") && !entry.endsWith(".test.ts") ? [absolutePath] : [];
  });
}

const isHttpBoundary = (file: string) =>
  file.startsWith("routes/") || file.startsWith("plugins/") || file.startsWith("security/");
const isRoute = (file: string) => file.startsWith("routes/");
const isServiceOrRepository = (file: string) =>
  file.startsWith("services/") || file.startsWith("repositories/");
const isBusinessCode = (file: string) => !file.startsWith("config/") && !file.startsWith("cli/");

const rules: ConventionRule[] = [
  {
    description: "API 不得返回旧版 { data } 裸响应",
    pattern: /(?:return|send\()\s*\{\s*data\s*:/,
    appliesTo: isHttpBoundary,
  },
  {
    description: "API 不得返回无法携带统一响应体的 204 或 304",
    pattern: /\.(?:status|code)\(\s*(?:204|304)\s*\)/,
    appliesTo: isHttpBoundary,
  },
  {
    description: "服务端禁止使用 console，必须使用结构化日志",
    pattern: /\bconsole\.(?:log|info|warn|error|debug)\s*\(/,
    appliesTo: () => true,
  },
  {
    description: "禁止显式 any；外部库适配必须使用 unknown 和类型守卫",
    pattern: /(?:\bas\s+any\b|:\s*any\b|<any>)/,
    appliesTo: () => true,
  },
  {
    description: "禁止用忽略指令绕过类型检查或代码规范",
    pattern: /@ts-(?:ignore|nocheck)|biome-ignore|eslint-disable/,
    appliesTo: () => true,
  },
  {
    description: "process.env 只能出现在 config/ 和受控 cli/ 入口",
    pattern: /\bprocess\.env\b/,
    appliesTo: isBusinessCode,
  },
  {
    description: "Route 禁止直接导入数据库 Schema",
    pattern: /from\s+["'][^"']*\/db\/schema(?:\/index)?["']/,
    appliesTo: isRoute,
  },
  {
    description: "Route 禁止直接导入 Drizzle",
    pattern: /from\s+["']drizzle-orm(?:\/[^"']*)?["']/,
    appliesTo: isRoute,
  },
  {
    description: "Service 和 Repository 禁止依赖 Fastify HTTP 类型",
    pattern: /from\s+["']fastify["']/,
    appliesTo: isServiceOrRepository,
  },
];

const violations: string[] = [];

for (const absolutePath of listTypeScriptFiles(serverSourceRoot)) {
  const relativePath = path.relative(serverSourceRoot, absolutePath);
  const source = readFileSync(absolutePath, "utf8");
  const lines = source.split("\n");

  for (const rule of rules) {
    if (!rule.appliesTo(relativePath)) continue;
    for (const [index, line] of lines.entries()) {
      if (rule.pattern.test(line)) {
        violations.push(`${relativePath}:${index + 1} ${rule.description}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Backend convention check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Backend convention check passed.");
}
