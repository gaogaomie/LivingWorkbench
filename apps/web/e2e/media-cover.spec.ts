import { createMediaItemSchema, editMediaItemSchema, type MediaItem } from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const timestamp = "2026-09-03T10:00:00.000Z";
const firstAssetId = "00000000-0000-4000-8000-000000000101";
const secondAssetId = "00000000-0000-4000-8000-000000000102";
const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("书影音封面可随作品上传并在编辑时替换", async ({ page }) => {
  let item: MediaItem | null = null;
  let uploadCount = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    const method = request.method();

    if (path === "/auth/session") {
      return fulfill(route, {
        user: { id: "00000000-0000-4000-8000-000000000001", username: "owner" },
        csrfToken,
        expiresAt: "2099-01-01T00:00:00.000Z",
      });
    }
    if (path === "/health/ready") {
      return fulfill(route, {
        status: "ok",
        service: "daily-life-server",
        version: "test",
        checkedAt: timestamp,
      });
    }
    if (path === "/schedule/reminders/due") return fulfill(route, { items: [] });
    if (path === "/media-items" && method === "GET") {
      return fulfill(route, {
        items: item ? [item] : [],
        summary: {
          completedThisYear: 0,
          averageRating: null,
          favoriteType: item?.type ?? null,
          ratingDistribution: {},
        },
      });
    }
    if (path === "/media-items" && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = createMediaItemSchema.parse(request.postDataJSON());
      item = {
        ...input,
        review: input.review ?? null,
        coverAssetId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return fulfill(route, { id: input.id });
    }
    if (path.startsWith("/media-items/") && path.endsWith("/cover") && method === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      expect(request.headers()["content-type"]).toContain("multipart/form-data; boundary=");
      expect(request.postDataBuffer()?.includes(Buffer.from(".png"))).toBe(true);
      uploadCount += 1;
      const assetId = uploadCount === 1 ? firstAssetId : secondAssetId;
      if (item) item = { ...item, coverAssetId: assetId, updatedAt: timestamp };
      return fulfill(route, { assetId });
    }
    if (path.startsWith("/media-items/") && method === "PUT") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      const input = editMediaItemSchema.parse(request.postDataJSON());
      if (item) item = { ...item, ...input, review: input.review ?? null, updatedAt: timestamp };
      return fulfill(route, { updated: true });
    }
    if (path.startsWith("/media-assets/")) {
      return fulfill(route, {
        mimeType: "image/png",
        contentBase64: transparentPng.toString("base64"),
        etag: path.endsWith(secondAssetId) ? "second-cover" : "first-cover",
      });
    }
    return fulfill(route, {});
  });

  await page.goto("/media");
  await page.getByRole("button", { name: "收藏作品", exact: true }).click();
  await page.getByLabel("作品名称").fill("P0 封面作品");
  await page.locator('input[type="file"]').setInputFiles({
    name: "cover.png",
    mimeType: "image/png",
    buffer: transparentPng,
  });
  await expect(page.getByRole("img", { name: "待保存的作品封面预览" })).toBeVisible();
  await page.getByRole("button", { name: "保存作品", exact: true }).click();

  await expect(page.getByRole("img", { name: "P0 封面作品封面" })).toBeVisible();
  expect(uploadCount).toBe(1);

  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: transparentPng,
  });
  await expect(page.getByRole("button", { name: "取消新封面" })).toBeVisible();
  await page.getByRole("button", { name: "保存作品修改" }).click();

  await expect(page.getByRole("button", { name: "保存作品修改" })).toHaveCount(0);
  expect(uploadCount).toBe(2);
  expect(item?.coverAssetId).toBe(secondAssetId);
  await expect(page.getByRole("img", { name: "P0 封面作品封面" })).toBeVisible();
});
