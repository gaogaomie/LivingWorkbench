import { expect, test } from "@playwright/test";

test("认证等待时铺满视口，未登录响应后移除加载并跳转", async ({ page }) => {
  let releaseSession: () => void = () => {};
  const sessionGate = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await sessionGate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ code: "UNAUTHENTICATED", message: "未登录", data: null }),
    });
  });

  try {
    await page.goto("/");
    const loading = page.getByRole("status", { name: "页面加载中，请稍候" });
    await expect(loading).toBeVisible();
    await expect
      .poll(() =>
        loading.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          };
        }),
      )
      .toMatchObject({ x: 0, y: 0 });
    const bounds = await loading.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds?.width).toBe(viewport?.width);
    expect(bounds?.height).toBe(viewport?.height);
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("page-loading.png") });
  } finally {
    releaseSession();
  }

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("status", { name: "页面加载中，请稍候" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
});
