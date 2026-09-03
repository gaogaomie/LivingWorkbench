import fs from "node:fs";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dir, "..");
const source = path.join(repositoryRoot, "apps/server/src/db/migrations");
const target = path.join(repositoryRoot, "apps/server/dist/migrations");

if (!fs.existsSync(source)) {
  throw new Error(`Server migrations directory is missing: ${source}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
