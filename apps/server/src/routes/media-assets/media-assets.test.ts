import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { createDatabase } from "../../db/client";
import { migrateDatabase } from "../../db/migrate";
import { AuthService } from "../../services/auth.service";
import { testServerConfig } from "../../test/config";

const uploadDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "riji-media-cover-"));
const config = { ...testServerConfig, uploadDirectory };
const database = createDatabase(":memory:");
migrateDatabase(database);
const authService = new AuthService(database.db, 30);
await authService.initializeAdmin("cover-owner", "correct-horse-battery-staple");
const app = await buildApp({ logger: false, config, database });

let cookie = "";
let csrfToken = "";
const mutationHeaders = () => ({
  cookie,
  origin: config.appOrigin,
  "x-csrf-token": csrfToken,
});

function multipartImage(bytes: Buffer, mimeType = "image/png") {
  const boundary = `----riji-${crypto.randomUUID()}`;
  return {
    payload: Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="cover"; filename="cover.png"\r\nContent-Type: ${mimeType}\r\n\r\n`,
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

beforeAll(async () => {
  await app.ready();
  const login = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { origin: config.appOrigin },
    payload: { username: "cover-owner", password: "correct-horse-battery-staple" },
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
  fs.rmSync(uploadDirectory, { recursive: true, force: true });
});

describe("media cover routes", () => {
  it("compresses, serves, replaces and removes an owned cover", async () => {
    const mediaId = "90000000-0000-4000-8000-000000000001";
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/media-items",
          headers: mutationHeaders(),
          payload: {
            id: mediaId,
            name: "封面测试作品",
            type: "book",
            status: "in_progress",
            rating: null,
            recordedOn: "2026-09-03",
            completedOn: null,
            review: null,
          },
        })
      ).statusCode,
    ).toBe(201);

    const firstImage = await sharp({
      create: { width: 80, height: 120, channels: 3, background: "#82d5bb" },
    })
      .png()
      .toBuffer();
    const firstMultipart = multipartImage(firstImage);
    const firstUpload = await app.inject({
      method: "POST",
      url: `/api/v1/media-items/${mediaId}/cover`,
      headers: { ...mutationHeaders(), "content-type": firstMultipart.contentType },
      payload: firstMultipart.payload,
    });
    expect(firstUpload.statusCode).toBe(201);
    const firstAssetId = firstUpload.json().data.assetId as string;

    const firstCover = await app.inject({
      method: "GET",
      url: `/api/v1/media-assets/${firstAssetId}`,
      headers: { cookie },
    });
    expect(firstCover.statusCode).toBe(200);
    expect(firstCover.json().data.mimeType).toBe("image/webp");
    expect(
      Buffer.from(firstCover.json().data.contentBase64, "base64").subarray(0, 4).toString(),
    ).toBe("RIFF");

    const secondImage = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#f7cd67" },
    })
      .jpeg()
      .toBuffer();
    const secondMultipart = multipartImage(secondImage, "image/jpeg");
    const secondUpload = await app.inject({
      method: "POST",
      url: `/api/v1/media-items/${mediaId}/cover`,
      headers: { ...mutationHeaders(), "content-type": secondMultipart.contentType },
      payload: secondMultipart.payload,
    });
    expect(secondUpload.statusCode).toBe(201);
    const secondAssetId = secondUpload.json().data.assetId as string;
    expect(secondAssetId).not.toBe(firstAssetId);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/api/v1/media-assets/${firstAssetId}`,
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(404);

    const media = await app.inject({
      method: "GET",
      url: "/api/v1/media-items?year=2026",
      headers: { cookie },
    });
    expect(media.json().data.items[0].coverAssetId).toBe(secondAssetId);

    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/v1/media-items/${mediaId}/cover`,
          headers: mutationHeaders(),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/api/v1/media-assets/${secondAssetId}`,
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(404);
    const remainingFiles = fs
      .readdirSync(uploadDirectory, { recursive: true })
      .filter((entry) => String(entry).endsWith(".webp"));
    expect(remainingFiles).toEqual([]);

    const invalidMultipart = multipartImage(Buffer.from("not-an-image"));
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/api/v1/media-items/${mediaId}/cover`,
          headers: { ...mutationHeaders(), "content-type": invalidMultipart.contentType },
          payload: invalidMultipart.payload,
        })
      ).statusCode,
    ).toBe(400);
  });
});
