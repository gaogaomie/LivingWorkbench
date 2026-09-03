import { z } from "zod";

export const serviceStatusSchema = z.enum(["ok", "degraded", "unavailable"]);

export const healthResponseSchema = z.object({
  status: serviceStatusSchema,
  service: z.literal("daily-life-server"),
  version: z.string(),
  checkedAt: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
