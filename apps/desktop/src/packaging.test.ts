import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { desktopTarget } from "../../../scripts/desktop-target";

describe("desktop packaging platform boundaries", () => {
  it.each([
    ["darwin", "x64", ["--mac", "--x64"]],
    ["darwin", "arm64", ["--mac", "--arm64"]],
    ["win32", "x64", ["--win", "--x64"]],
  ])("selects host binaries for %s %s", (platform, arch, expected) => {
    expect(desktopTarget(platform, arch)).toEqual(expected);
  });
  it("accepts an explicit matching target", () => {
    expect(desktopTarget("win32", "x64", "win")).toEqual(["--win", "--x64"]);
    expect(desktopTarget("darwin", "arm64", "mac")).toEqual(["--mac", "--arm64"]);
  });
  it.each([
    ["darwin", "x64", "win"],
    ["win32", "x64", "mac"],
    ["win32", "arm64", undefined],
    ["win32", "ia32", undefined],
    ["linux", "x64", undefined],
    ["darwin", "x64", "unknown"],
  ])("rejects unsupported or mismatched binaries: %s %s %s", (platform, arch, target) => {
    expect(() => desktopTarget(platform, arch, target)).toThrow();
  });
  it("ships a per-user Windows installer without deleting user data", async () => {
    const config = JSON.parse(
      await readFile(new URL("../electron-builder.json", import.meta.url), "utf8"),
    );
    expect(config.win.target).toEqual(["nsis"]);
    expect(config.win.executableName).toBe("DailyLife");
    expect(config.nsis).toMatchObject({
      perMachine: false,
      allowElevation: false,
      deleteAppDataOnUninstall: false,
    });
    expect(config.mac.target).toEqual(["dmg"]);
    expect(config.files).toEqual(["dist/**/*", "package.json"]);
  });
});
