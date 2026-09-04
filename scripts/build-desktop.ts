import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const output = path.join(root, "apps/desktop/runtime/dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [entry, format, filename] of [
  ["main.ts", "cjs", "main.cjs"],
  ["preload.ts", "cjs", "preload.cjs"],
  ["backend-worker.ts", "esm", "backend-worker.mjs"],
  ["settings-renderer.ts", "iife", "ui/setup.js"],
] as const) {
  const result = await Bun.build({
    entrypoints: [path.join(root, "apps/desktop/src", entry)],
    outdir: output,
    target: entry === "settings-renderer.ts" ? "browser" : "node",
    format,
    naming: filename,
    external: ["electron", "better-sqlite3", "argon2", "sharp"],
  });
  if (!result.success) throw new AggregateError(result.logs, `Desktop build failed: ${entry}`);
}
await cp(path.join(root, "apps/desktop/ui"), path.join(output, "ui"), { recursive: true });
await cp(
  path.join(root, "apps/web/public/brand/module-ip-transparent/J2-overview-owl-right.png"),
  path.join(output, "ui/owl.png"),
);
await cp(path.join(root, "apps/server/src/db/migrations"), path.join(output, "migrations"), {
  recursive: true,
});
// Only production web assets are shipped; never copy the repository or its .env/data folders.
await readFile(path.join(root, "apps/web/dist/index.html"));
await cp(path.join(root, "apps/web/dist"), path.join(output, "web"), { recursive: true });
console.log("Desktop runtime built: apps/desktop/runtime");
