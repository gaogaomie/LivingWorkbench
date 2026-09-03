import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import type { AppDatabase } from "../db/client";
import { assets, mediaItems } from "../db/schema";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

type CoverErrorCode = "invalid" | "not_found" | "unavailable";

export class MediaCoverError extends Error {
  constructor(
    readonly code: CoverErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "MediaCoverError";
  }
}

function nextTimestamp(previous: string): string {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

export class MediaCoverService {
  constructor(
    private readonly db: AppDatabase,
    private readonly uploadDirectory: string | null,
  ) {}

  countForUser(userId: string): number {
    return this.db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.ownerType, "media")))
      .all().length;
  }

  async upload(
    userId: string,
    mediaItemId: string,
    input: { bytes: Buffer; mimeType: string },
  ): Promise<{ assetId: string }> {
    const uploadDirectory = this.requireUploadDirectory();
    if (
      input.bytes.length === 0 ||
      input.bytes.length > MAX_UPLOAD_BYTES ||
      !ALLOWED_MIME_TYPES.has(input.mimeType)
    ) {
      throw new MediaCoverError("invalid", "请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片。");
    }
    const current = this.db
      .select({ updatedAt: mediaItems.updatedAt, coverAssetId: mediaItems.coverAssetId })
      .from(mediaItems)
      .where(
        and(
          eq(mediaItems.id, mediaItemId),
          eq(mediaItems.userId, userId),
          isNull(mediaItems.deletedAt),
        ),
      )
      .get();
    if (!current) throw new MediaCoverError("not_found", "没有找到对应作品。");

    let result: { data: Buffer; info: { width: number; height: number } };
    try {
      const image = sharp(input.bytes, {
        failOn: "warning",
        limitInputPixels: MAX_INPUT_PIXELS,
      });
      const metadata = await image.metadata();
      if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        throw new MediaCoverError("invalid", "图片内容不是支持的 JPG、PNG 或 WebP 格式。");
      }
      result = await image
        .rotate()
        .resize({ width: 900, height: 1_200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer({ resolveWithObject: true });
    } catch (error) {
      if (error instanceof MediaCoverError) throw error;
      throw new MediaCoverError("invalid", "无法读取这张图片，请换一张后重试。", {
        cause: error,
      });
    }
    if (!result.info.width || !result.info.height) {
      throw new MediaCoverError("invalid", "无法确认图片尺寸，请换一张后重试。");
    }

    const assetId = randomUUID();
    const storageKey = path.join("media", assetId.slice(0, 2), `${assetId}.webp`);
    const destination = this.resolveStoragePath(uploadDirectory, storageKey);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, result.data, { flag: "wx" });

    let oldStorageKey: string | null = null;
    try {
      this.db.transaction((tx) => {
        const fresh = tx
          .select({ updatedAt: mediaItems.updatedAt, coverAssetId: mediaItems.coverAssetId })
          .from(mediaItems)
          .where(
            and(
              eq(mediaItems.id, mediaItemId),
              eq(mediaItems.userId, userId),
              isNull(mediaItems.deletedAt),
            ),
          )
          .get();
        if (!fresh) throw new MediaCoverError("not_found", "没有找到对应作品。");
        if (fresh.coverAssetId) {
          oldStorageKey =
            tx
              .select({ storageKey: assets.storageKey })
              .from(assets)
              .where(and(eq(assets.id, fresh.coverAssetId), eq(assets.userId, userId)))
              .get()?.storageKey ?? null;
          tx.delete(assets)
            .where(and(eq(assets.id, fresh.coverAssetId), eq(assets.userId, userId)))
            .run();
        }
        const now = nextTimestamp(fresh.updatedAt);
        tx.insert(assets)
          .values({
            id: assetId,
            userId,
            ownerType: "media",
            ownerId: mediaItemId,
            mimeType: "image/webp",
            storageKey,
            checksumSha256: createHash("sha256").update(result.data).digest("hex"),
            width: result.info.width,
            height: result.info.height,
            size: result.data.length,
            isDemo: false,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        tx.update(mediaItems)
          .set({ coverAssetId: assetId, updatedAt: now })
          .where(eq(mediaItems.id, mediaItemId))
          .run();
      });
    } catch (error) {
      await fs.rm(destination, { force: true });
      throw error;
    }
    if (oldStorageKey) await this.removeStoredFile(uploadDirectory, oldStorageKey);
    return { assetId };
  }

  async read(
    userId: string,
    assetId: string,
  ): Promise<{ bytes: Buffer; mimeType: string; checksumSha256: string }> {
    const uploadDirectory = this.requireUploadDirectory();
    const asset = this.db
      .select({
        storageKey: assets.storageKey,
        mimeType: assets.mimeType,
        checksumSha256: assets.checksumSha256,
      })
      .from(assets)
      .where(
        and(
          eq(assets.id, assetId),
          eq(assets.userId, userId),
          eq(assets.ownerType, "media"),
          isNull(assets.deletedAt),
        ),
      )
      .get();
    if (!asset) throw new MediaCoverError("not_found", "没有找到这张封面。");
    const linked = this.db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(
        and(
          eq(mediaItems.userId, userId),
          eq(mediaItems.coverAssetId, assetId),
          isNull(mediaItems.deletedAt),
        ),
      )
      .get();
    if (!linked) throw new MediaCoverError("not_found", "没有找到这张封面。");
    try {
      return {
        bytes: await fs.readFile(this.resolveStoragePath(uploadDirectory, asset.storageKey)),
        mimeType: asset.mimeType,
        checksumSha256: asset.checksumSha256,
      };
    } catch (error) {
      throw new MediaCoverError("not_found", "封面文件已经不存在。", { cause: error });
    }
  }

  async remove(userId: string, mediaItemId: string): Promise<boolean> {
    const uploadDirectory = this.requireUploadDirectory();
    let storageKey: string | null = null;
    const removed = this.db.transaction((tx) => {
      const current = tx
        .select({ updatedAt: mediaItems.updatedAt, coverAssetId: mediaItems.coverAssetId })
        .from(mediaItems)
        .where(
          and(
            eq(mediaItems.id, mediaItemId),
            eq(mediaItems.userId, userId),
            isNull(mediaItems.deletedAt),
          ),
        )
        .get();
      if (!current) throw new MediaCoverError("not_found", "没有找到对应作品。");
      if (!current.coverAssetId) return false;
      storageKey =
        tx
          .select({ storageKey: assets.storageKey })
          .from(assets)
          .where(and(eq(assets.id, current.coverAssetId), eq(assets.userId, userId)))
          .get()?.storageKey ?? null;
      tx.update(mediaItems)
        .set({ coverAssetId: null, updatedAt: nextTimestamp(current.updatedAt) })
        .where(eq(mediaItems.id, mediaItemId))
        .run();
      tx.delete(assets)
        .where(and(eq(assets.id, current.coverAssetId), eq(assets.userId, userId)))
        .run();
      return true;
    });
    if (storageKey) await this.removeStoredFile(uploadDirectory, storageKey);
    return removed;
  }

  async removeAllForUser(userId: string): Promise<void> {
    if (!this.uploadDirectory) return;
    const stored = this.db
      .select({ storageKey: assets.storageKey })
      .from(assets)
      .where(and(eq(assets.userId, userId), eq(assets.ownerType, "media")))
      .all();
    this.db
      .delete(assets)
      .where(and(eq(assets.userId, userId), eq(assets.ownerType, "media")))
      .run();
    await Promise.all(
      stored.map((item) => this.removeStoredFile(this.uploadDirectory as string, item.storageKey)),
    );
  }

  private requireUploadDirectory(): string {
    if (!this.uploadDirectory) {
      throw new MediaCoverError("unavailable", "当前环境未配置封面存储目录。");
    }
    return this.uploadDirectory;
  }

  private resolveStoragePath(uploadDirectory: string, storageKey: string): string {
    const root = path.resolve(uploadDirectory);
    const destination = path.resolve(root, storageKey);
    if (!destination.startsWith(`${root}${path.sep}`)) {
      throw new MediaCoverError("invalid", "封面存储路径不正确。");
    }
    return destination;
  }

  private async removeStoredFile(uploadDirectory: string, storageKey: string): Promise<void> {
    try {
      await fs.rm(this.resolveStoragePath(uploadDirectory, storageKey), { force: true });
    } catch {
      // The database remains authoritative; stale files can be cleaned by maintenance later.
    }
  }
}
