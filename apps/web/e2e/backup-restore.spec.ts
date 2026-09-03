import {
  backupWorkbookUploadSchema,
  type RestorePreflightResponse,
  restoreBackupRequestSchema,
} from "@daily-life/shared";
import { expect, type Route, test } from "@playwright/test";

const csrfToken = "test-token-00000000000000000000000000000000";
const checksum = "a".repeat(64);

async function fulfill(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 200, message: "success", data }),
  });
}

test("备份恢复先预检风险，再携带校验码与 CSRF 执行恢复", async ({ page }) => {
  let restoreRequest: unknown = null;
  const preflight: RestorePreflightResponse = {
    checksumSha256: checksum,
    exportedAt: "2026-09-03T09:00:00.000Z",
    entityCounts: { financeEntries: 2, mediaItems: 1 },
    totalEntities: 3,
    affectedMediaCoverCount: 3,
    warnings: [
      "恢复会整体替换当前业务数据。",
      "封面文件不在此备份中；整体恢复会移除当前所有书影音封面。",
    ],
  };

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");

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
        checkedAt: "2026-09-03T09:00:00.000Z",
      });
    }
    if (path === "/schedule/reminders/due") return fulfill(route, { items: [] });
    if (path === "/trash") {
      return fulfill(route, {
        items: [
          {
            id: "00000000-0000-4000-8000-000000000011",
            source: "fitness",
            label: "2026-09-03 健身记录",
            deletedAt: "2026-09-03T00:42:00.000Z",
            updatedAt: "2026-09-03T00:40:00.000Z",
          },
          {
            id: "00000000-0000-4000-8000-000000000012",
            source: "habit",
            label: "早睡",
            deletedAt: "2026-09-03T00:39:00.000Z",
            updatedAt: "2026-09-03T00:38:00.000Z",
          },
        ],
      });
    }
    if (path === "/data/restore/preflight") {
      expect(backupWorkbookUploadSchema.safeParse(request.postDataJSON()).success).toBe(true);
      return fulfill(route, preflight);
    }
    if (path === "/data/restore") {
      expect(request.headers()["x-csrf-token"]).toBe(csrfToken);
      restoreRequest = restoreBackupRequestSchema.parse(request.postDataJSON());
      return fulfill(route, { restored: true });
    }
    return fulfill(route, {});
  });

  await page.goto("/settings");

  const exportButton = page.getByRole("button", { name: "生成并下载备份" });
  const chooseBackupButton = page.getByRole("button", { name: "选择 Excel 备份" });
  const viewport = page.viewportSize();
  if (viewport && viewport.width >= 640) {
    const [exportBox, chooseBackupBox] = await Promise.all([
      exportButton.boundingBox(),
      chooseBackupButton.boundingBox(),
    ]);
    expect(exportBox).not.toBeNull();
    expect(chooseBackupBox).not.toBeNull();
    expect(Math.abs((exportBox?.y ?? 0) - (chooseBackupBox?.y ?? 0))).toBeLessThanOrEqual(2);
  }

  const firstTrashRecord = page.locator("article").filter({ hasText: "2026-09-03 健身记录" });
  await expect(firstTrashRecord).toHaveCSS("border-bottom-style", "dashed");
  await expect(firstTrashRecord).toHaveCSS("border-bottom-width", "2px");

  await page.getByLabel("Excel 备份文件").setInputFiles({
    name: "riji-backup-2026-09-03.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("PK-test-workbook"),
  });

  await expect(page.getByRole("heading", { name: "恢复摘要" })).toBeVisible();
  await expect(page.getByText("当前有 3 张书影音封面会在整体恢复时被移除。")).toBeVisible();
  await expect(page.getByText("aaaaaaaaaaaa…")).toBeVisible();

  await page.getByRole("button", { name: "准备整体恢复" }).click();
  await expect(page.getByText(/当前.*3.*张封面都会被移除/)).toBeVisible();
  await page.getByRole("button", { name: "确认替换当前数据" }).click();

  expect(restoreRequest).toMatchObject({
    expectedChecksumSha256: checksum,
    workbookBase64: Buffer.from("PK-test-workbook").toString("base64"),
  });
  await expect(page.getByRole("heading", { name: "恢复摘要" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "确认恢复备份" })).toHaveCount(0);
});
