import { isApiResponse } from "@daily-life/shared";
import type { FastifyInstance } from "fastify";

export function registerApiResponseGuard(app: FastifyInstance): void {
  app.addHook("preSerialization", async (_request, reply, payload) => {
    if (!isApiResponse(payload)) {
      throw new Error("API response must contain only code, message, and data");
    }
    const isHttpSuccess = reply.statusCode >= 200 && reply.statusCode < 300;
    if ((isHttpSuccess && payload.code !== 200) || (!isHttpSuccess && payload.code === 200)) {
      throw new Error("API business code does not match the HTTP response status");
    }
    return payload;
  });
}
