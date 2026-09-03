import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, 30);
await authService.initializeAdmin("backup-owner", "correct-horse-battery-staple");
const app = await buildApp({ logger: false, config: testServerConfig, database });

let cookie = "";
let csrfToken = "";
const headers = () => ({
  cookie,
  origin: testServerConfig.appOrigin,
  "x-csrf-token": csrfToken,
});

beforeAll(async () => {
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: testServerConfig.appOrigin },
    payload: { username: "backup-owner", password: "correct-horse-battery-staple" },
  });
  cookie =
    (Array.isArray(login.headers["set-cookie"])
      ? login.headers["set-cookie"][0]
      : login.headers["set-cookie"]
    )?.split(";", 1)[0] ?? "";
  csrfToken = login.json().data.csrfToken;
});

afterAll(async () => {
  await app.close();
});

describe("data backup routes", () => {
  it("exports, verifies and transactionally restores business data", async () => {
    const createEntry = (id: string, note: string) =>
      app.inject({
        method: "POST",
        url: "/api/v1/finance/entries",
        headers: headers(),
        payload: {
          id,
          type: "expense",
          amountFen: 2_500,
          categoryId: "food",
          date: "2026-09-02",
          note,
        },
      });
    expect(
      (await createEntry("20000000-0000-4000-8000-000000000001", "备份前记录")).statusCode,
    ).toBe(201);

    const exported = await app.inject({
      method: "GET",
      url: "/api/v1/data/export.xlsx",
      headers: { cookie },
    });
    expect(exported.statusCode).toBe(200);
    const exportedData = exported.json().data;
    expect(exportedData.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const exportedBytes = Buffer.from(exportedData.contentBase64, "base64");
    expect(exportedBytes.subarray(0, 2).toString()).toBe("PK");
    const workbook = new ExcelJS.Workbook();
    const exportedArrayBuffer = exportedBytes.buffer.slice(
      exportedBytes.byteOffset,
      exportedBytes.byteOffset + exportedBytes.byteLength,
    ) as ArrayBuffer;
    await workbook.xlsx.load(exportedArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "导出说明",
      "财务",
      "习惯",
      "健身",
      "日程",
      "待买",
      "书影音",
      "_RIJI_BACKUP",
    ]);
    expect(workbook.getWorksheet("_RIJI_BACKUP")?.state).toBe("veryHidden");
    const workbookBase64 = exportedData.contentBase64;

    const preflight = await app.inject({
      method: "POST",
      url: "/api/v1/data/restore/preflight",
      headers: { cookie },
      payload: { workbookBase64 },
    });
    expect(preflight.statusCode).toBe(200);
    const preflightData = preflight.json().data;
    expect(preflightData).toMatchObject({
      entityCounts: { financeEntries: 1 },
      affectedMediaCoverCount: 0,
    });
    expect(preflightData.warnings).toContain(
      "封面文件不在此备份中；整体恢复会移除当前所有书影音封面。",
    );
    expect(preflightData.checksumSha256).toMatch(/^[a-f0-9]{64}$/);

    const systemSheet = workbook.getWorksheet("_RIJI_BACKUP");
    expect(systemSheet).toBeDefined();
    const chunkCount = Number(systemSheet?.getCell("A2").value);
    let serialized = "";
    for (let index = 0; index < chunkCount; index += 1) {
      serialized += systemSheet?.getCell(index + 3, 1).text ?? "";
    }
    const tampered = JSON.parse(serialized);
    tampered.data.financeEntries[0].note = "被修改";
    const tamperedSerialized = JSON.stringify(tampered);
    if (systemSheet) {
      systemSheet.getCell("A2").value = 1;
      systemSheet.getCell("A3").value = tamperedSerialized;
    }
    const tamperedBytes = Buffer.from(await workbook.xlsx.writeBuffer());
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/data/restore/preflight",
          headers: { cookie },
          payload: { workbookBase64: tamperedBytes.toString("base64") },
        })
      ).statusCode,
    ).toBe(400);

    expect(
      (await createEntry("20000000-0000-4000-8000-000000000002", "恢复后应消失")).statusCode,
    ).toBe(201);
    const restored = await app.inject({
      method: "POST",
      url: "/api/v1/data/restore",
      headers: headers(),
      payload: { workbookBase64, expectedChecksumSha256: preflightData.checksumSha256 },
    });
    expect(restored.statusCode).toBe(200);

    const finance = await app.inject({
      method: "GET",
      url: "/api/v1/finance?month=2026-09",
      headers: { cookie },
    });
    expect(finance.json().data.entries).toHaveLength(1);
    expect(finance.json().data.entries[0].note).toBe("备份前记录");

    const session = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      headers: { cookie },
    });
    expect(session.statusCode).toBe(200);
  });
});
