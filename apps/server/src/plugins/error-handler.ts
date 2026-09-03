import { createApiFailure } from "@daily-life/shared";
import type { FastifyInstance } from "fastify";

function readError(error: unknown): {
  code: string | undefined;
  message: string;
  statusCode: number | undefined;
} {
  if (!(error instanceof Error)) {
    return { code: undefined, message: "Unknown server error", statusCode: undefined };
  }

  const statusCode =
    "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : undefined;
  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;

  return { code, message: error.message, statusCode };
}

function publicError(statusCode: number): { code: string; message: string } {
  if (statusCode === 400) return { code: "VALIDATION_ERROR", message: "请求格式不正确。" };
  if (statusCode === 401) return { code: "UNAUTHENTICATED", message: "请先登录后再试。" };
  if (statusCode === 403) return { code: "FORBIDDEN", message: "没有权限执行此操作。" };
  if (statusCode === 404) return { code: "NOT_FOUND", message: "请求的接口不存在。" };
  if (statusCode === 409) return { code: "CONFLICT", message: "数据状态已发生变化。" };
  if (statusCode === 413) return { code: "PAYLOAD_TOO_LARGE", message: "请求内容过大。" };
  if (statusCode === 429) return { code: "RATE_LIMITED", message: "请求过于频繁，请稍后重试。" };
  return { code: "SERVER_UNAVAILABLE", message: "服务暂时不可用，请稍后重试。" };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const normalized = readError(error);

    request.log.error(
      {
        code: normalized.code,
        requestId: request.id,
        statusCode: normalized.statusCode,
      },
      "request failed",
    );

    const statusCode =
      normalized.statusCode && normalized.statusCode < 500 ? normalized.statusCode : 500;
    const { code, message } = publicError(statusCode);
    return reply
      .status(statusCode)
      .send(createApiFailure(code, message, { requestId: request.id }));
  });

  app.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .send(createApiFailure("NOT_FOUND", "请求的接口不存在。", { requestId: request.id })),
  );
}
