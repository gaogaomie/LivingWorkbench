import fs from "node:fs";
import path from "node:path";
import { APP_VERSION } from "../apps/server/src/version";

const repositoryRoot = path.resolve(import.meta.dir, "..");
const requiredFiles = [
  "apps/server/dist/server.js",
  "apps/server/dist/migrations/0000_damp_betty_brant.sql",
  "apps/server/dist/migrations/meta/_journal.json",
  "apps/web/dist/index.html",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(repositoryRoot, file)));

if (missing.length > 0) {
  throw new Error(`Release artifacts are incomplete: ${missing.join(", ")}`);
}

const packageFiles = [
  "package.json",
  "apps/server/package.json",
  "apps/web/package.json",
  "packages/shared/package.json",
];
for (const file of packageFiles) {
  const packageJson: unknown = JSON.parse(fs.readFileSync(path.join(repositoryRoot, file), "utf8"));
  const version =
    typeof packageJson === "object" && packageJson !== null && "version" in packageJson
      ? packageJson.version
      : null;
  if (version !== APP_VERSION) {
    throw new Error(`${file} version ${String(version)} does not match ${APP_VERSION}`);
  }
}

const changelog = fs.readFileSync(path.join(repositoryRoot, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`## ${APP_VERSION} -`)) {
  throw new Error(`CHANGELOG.md does not contain release ${APP_VERSION}`);
}

console.log("Release artifact check passed.");
