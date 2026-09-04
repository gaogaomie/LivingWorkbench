import path from "node:path";
import { desktopTarget } from "./desktop-target";

const flags = desktopTarget(process.platform, process.arch, process.argv[2]);
if (process.argv.length > 3) throw new Error("仅接受一个打包目标：mac 或 win。");
const root = path.resolve(import.meta.dir, "..");
// Reinstall on the build host so copied node_modules cannot ship another platform's binaries.
for (const command of [
  [process.execPath, "run", "desktop:deps"],
  [process.execPath, "run", "build:desktop"],
  [
    "node",
    "node_modules/electron-builder/cli.js",
    "--config",
    "apps/desktop/electron-builder.json",
    ...flags,
    "--publish",
    "never",
  ],
]) {
  const child = Bun.spawn(command, { cwd: root, stdout: "inherit", stderr: "inherit" });
  const status = await child.exited;
  if (status !== 0) process.exit(status);
}
