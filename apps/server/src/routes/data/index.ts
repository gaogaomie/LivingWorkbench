import {
  backupWorkbookUploadSchema,
  createApiSuccess,
  restoreBackupRequestSchema,
  restorePreflightResponseSchema,
} from "@daily-life/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { ServerConfig } from "../../config/env";
import {
  rejectRequest,
  requireSession,
  verifyMutationRequest,
} from "../../security/authenticated-request";
import type { AuthenticatedSession, AuthService } from "../../services/auth.service";
import { BackupValidationError } from "../../services/data-backup.service";
import type { ExcelBackupService } from "../../services/excel-backup.service";

interface DataRoutesOptions {
  authService: AuthService;
  config: ServerConfig;
  backupService: ExcelBackupService;
}

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

function invalidBackup(reply: FastifyReply, message = "备份文件格式不正确。") {
  return rejectRequest(reply, "BACKUP_INVALID", message, 400);
}

export const registerDataRoutes: FastifyPluginAsync<DataRoutesOptions> = async (
  app,
  { authService, config, backupService },
) => {
  app.get("/export.xlsx", async (request, reply) => {
    const session = requireSession(request, reply, authService);
    if (!session) return;
    const result = await backupService.export(session.user.id);
    const date = result.backup.manifest.exportedAt.slice(0, 10);
    return createApiSuccess({
      fileName: `riji-backup-${date}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentBase64: result.workbook.toString("base64"),
    });
  });

  app.post("/restore/preflight", { bodyLimit: 16 * 1024 * 1024 }, async (request, reply) => {
    const session = requireSession(request, reply, authService);
    const body = backupWorkbookUploadSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return invalidBackup(reply);
    try {
      return createApiSuccess(
        restorePreflightResponseSchema.parse(
          await backupService.preflight(session.user.id, body.data.workbookBase64),
        ),
      );
    } catch (error) {
      return error instanceof BackupValidationError
        ? invalidBackup(reply, error.message)
        : Promise.reject(error);
    }
  });

  app.post("/restore", { bodyLimit: 16 * 1024 * 1024 }, async (request, reply) => {
    const session = requireMutation(request, reply, authService, config);
    const body = restoreBackupRequestSchema.safeParse(request.body);
    if (!session) return;
    if (!body.success) return invalidBackup(reply);
    try {
      await backupService.restore(
        session.user.id,
        body.data.workbookBase64,
        body.data.expectedChecksumSha256,
      );
      return createApiSuccess({ restored: true as const });
    } catch (error) {
      return error instanceof BackupValidationError
        ? invalidBackup(reply, error.message)
        : Promise.reject(error);
    }
  });
};
