import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

const runtime = path.resolve(import.meta.dirname, "../../desktop/runtime");
const executablePath = process.env.DESKTOP_EXECUTABLE;
test("桌面首次设置、真实登录、重启持久化和安全边界", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "日常集 desktop smoke-"));
  const launchOptions = {
    ...(executablePath ? { executablePath } : {}),
    args: [...(executablePath ? [] : [runtime]), `--daily-life-data-dir=${directory}`],
  };
  let application = await electron.launch(launchOptions);
  try {
    const setup = await application.firstWindow();
    await expect(setup.getByRole("heading", { name: "把日常，留在自己身边。" })).toBeVisible();
    await setup.screenshot({ path: test.info().outputPath("desktop-setup.png") });
    await setup.getByLabel("本地用户名", { exact: true }).fill("desktop-owner");
    await setup.getByLabel("登录密码", { exact: true }).fill("desktop-test-password-123");
    const workbenchPromise = application.waitForEvent("window");
    await setup.getByRole("button", { name: "开始我的日常" }).click();
    const workbench = await workbenchPromise;
    await expect(workbench.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
    const origin = new URL(workbench.url()).origin;
    const denied = await fetch(`${origin}/api/v1/health/ready`);
    expect(denied.status).toBe(403);
    expect(await workbench.evaluate(() => "dailyLifeDesktop" in window)).toBe(false);
    await workbench.getByLabel("用户名").fill("desktop-owner");
    await workbench.getByLabel("密码", { exact: true }).fill("desktop-test-password-123");
    await workbench.getByRole("button", { name: "回到岛上" }).click();
    await expect(workbench.getByRole("heading", { name: "今天，慢慢来" })).toBeVisible();
    await workbench.screenshot({ path: test.info().outputPath("desktop-workbench.png") });
    expect((await readFile(path.join(directory, "settings.enc"))).toString()).not.toContain(
      "sessionSecret",
    );
    await application.close();
    application = await electron.launch(launchOptions);
    const reopened = await application.firstWindow();
    await expect(reopened).not.toHaveURL(/setup\.html$/);
    await expect(reopened.getByRole("heading", { name: "今天，慢慢来" })).toBeVisible();
    const reopenedOrigin = new URL(reopened.url()).origin;
    if (process.platform === "win32") {
      const closed = application.waitForEvent("close");
      await application.evaluate(({ BrowserWindow }) => {
        for (const window of BrowserWindow.getAllWindows()) window.close();
      });
      await closed;
    } else {
      await application.close();
    }
    await expect
      .poll(async () => {
        try {
          await fetch(`${reopenedOrigin}/api/v1/health/ready`);
          return false;
        } catch {
          return true;
        }
      })
      .toBe(true);
  } finally {
    await application.close();
    await rm(directory, { recursive: true, force: true });
  }
});
