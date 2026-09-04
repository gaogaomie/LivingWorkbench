import { loginRequestSchema } from "@daily-life/shared";
import { z } from "zod";

export const desktopSettingsSchema = z.object({
  sessionSecret: z.string().min(32),
  deepSeekApiKey: z.string().min(20).nullable(),
  deepSeekModel: z.string().trim().min(1).max(100),
});
export type DesktopSettings = z.infer<typeof desktopSettingsSchema>;

export const saveSettingsSchema = z
  .object({
    apiKey: z.string().trim().max(512),
    clearApiKey: z.boolean(),
    model: z.string().trim().min(1).max(100),
    account: loginRequestSchema.optional(),
  })
  .strict();
export type SaveSettings = z.infer<typeof saveSettingsSchema>;

export const workerRequestSchema = z.discriminatedUnion("action", [
  z.object({
    id: z.number(),
    action: z.literal("start"),
    directory: z.string(),
    webRoot: z.string(),
    token: z.string().min(32),
    settings: desktopSettingsSchema,
  }),
  z.object({ id: z.number(), action: z.literal("setup"), account: loginRequestSchema }),
  z.object({ id: z.number(), action: z.literal("settings"), settings: desktopSettingsSchema }),
  z.object({ id: z.number(), action: z.literal("import"), source: z.string() }),
  z.object({ id: z.number(), action: z.literal("stop") }),
]);
export type WorkerRequest = z.infer<typeof workerRequestSchema>;
export type WorkerCommand = WorkerRequest extends infer Request
  ? Request extends WorkerRequest
    ? Omit<Request, "id">
    : never
  : never;
export const workerReplySchema = z.object({
  id: z.number(),
  ok: z.boolean(),
  origin: z.string().optional(),
  needsSetup: z.boolean().optional(),
  error: z.string().optional(),
});
export type WorkerReply = z.infer<typeof workerReplySchema>;

export interface SettingsView {
  needsSetup: boolean;
  hasApiKey: boolean;
  model: string;
  directory: string;
}
export interface DesktopBridge {
  getState(): Promise<SettingsView>;
  save(input: SaveSettings): Promise<{ ok: boolean; error?: string }>;
  importWorkspace(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
}
