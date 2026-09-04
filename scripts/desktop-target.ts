/** Native runtime dependencies and the bundled Electron must match the build host. */
export function desktopTarget(platform: string, arch: string, requested?: string): string[] {
  const target = platform === "darwin" ? "mac" : platform === "win32" ? "win" : undefined;
  if (!target) throw new Error("桌面安装包目前只支持在 macOS 或 Windows 上构建。");
  if (requested && requested !== target)
    throw new Error("请在目标系统上打包，不能混用其他系统的 Electron 和原生依赖。");
  if ((target === "win" && arch !== "x64") || !["x64", "arm64"].includes(arch))
    throw new Error("Windows 当前支持 x64；macOS 支持 x64 和 arm64，请使用对应架构环境。");
  return [`--${target}`, `--${arch}`];
}
