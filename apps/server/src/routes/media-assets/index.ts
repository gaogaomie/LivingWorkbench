import { createApiSuccess } from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ServerConfig } from "../../config/env";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";
import { MediaCoverError, type MediaCoverService } from "../../services/media-cover.service";

interface MediaAssetRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
  mediaCoverService: MediaCoverService;
}

const idParamsSchema = z.object({ id: z.string().uuid() });

function requireMutation(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AuthService,
  config: ServerConfig,
): AuthenticatedSession | null {
  const session = requireSession(request, reply, authService);
  if (!session) return null;
  return verifyMutationRequest(request, reply, session, authService, config) ? session : null;
}

function rejectCoverError(reply: FastifyReply, error: MediaCoverError) {
  if (error.code === "not_found") {
    return rejectRequest(reply, "NOT_FOUND", error.message, 404);
  }
  if (error.code === "unavailable") {
    return rejectRequest(reply, "UPLOAD_UNAVAILABLE", error.message, 503);
  }
  return rejectRequest(reply, "INVALID_IMAGE", error.message, 400);
}

export const registerMediaAssetRoutes: FastifyPluginAsync<MediaAssetRoutesOptions> = async (
  app,
  { authService, config, mediaCoverService },
) => {
  app.get("/media-assets/:id", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const params = idParamsSchema.safeParse(request.params);
    if (!session) return;
    if (!params.success) return rejectRequest(reply, "VALIDATION_ERROR", "封面地址不正确。", 400);
    try {
      const asset = await mediaCoverService.read(session.user.id, params.data.id);
      const etag = `"${asset.checksumSha256}"`;
      return createApiSuccess({
        mimeType: asset.mimeType,
        contentBase64: asset.bytes.toString("base64"),
        etag,
      });
    } catch (error) {
      return error instanceof MediaCoverError
        ? rejectCoverError(reply, error)
        : Promise.reject(error);
    }
  });

  app.post("/media-items/:id/cover", { bodyLimit: 6 * 1024 * 1024 }, async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    if (!session) return;
    if (!params.success) {
      return rejectRequest(reply, "VALIDATION_ERROR", "作品地址不正确。", 400);
    }
    try {
      const file = await request.file({
        limits: { files: 1, fileSize: 5 * 1024 * 1024, fields: 0 },
      });
      if (!file) {
        return rejectRequest(reply, "INVALID_IMAGE", "请选择一张封面图片。", 400);
      }
      const result = await mediaCoverService.upload(session.user.id, params.data.id, {
        bytes: await file.toBuffer(),
        mimeType: file.mimetype,
      });
      return reply.status(201).send(createApiSuccess(result));
    } catch (error) {
      if (error instanceof MediaCoverError) return rejectCoverError(reply, error);
      if (error instanceof Error && /file.*large|request.*large/i.test(error.message)) {
        return rejectRequest(reply, "INVALID_IMAGE", "封面图片不能超过 5 MB。", 413);
      }
      return Promise.reject(error);
    }
  });

  app.delete("/media-items/:id/cover", async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const params = idParamsSchema.safeParse(request.params);
    if (!session) return;
    if (!params.success) {
      return rejectRequest(reply, "VALIDATION_ERROR", "作品地址不正确。", 400);
    }
    try {
      await mediaCoverService.remove(session.user.id, params.data.id);
      return createApiSuccess(null);
    } catch (error) {
      return error instanceof MediaCoverError
        ? rejectCoverError(reply, error)
        : Promise.reject(error);
    }
  });
};
