import path from "node:path";
import { fileURLToPath } from "node:url";
import { rebuild } from "@electron/rebuild";
import electronPackage from "electron/package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await rebuild({
  buildPath: path.join(root, "apps/desktop/runtime"),
  electronVersion: electronPackage.version,
  arch: process.arch,
  onlyModules: ["better-sqlite3"],
  headerURL: "https://artifacts.electronjs.org/headers/dist",
});
