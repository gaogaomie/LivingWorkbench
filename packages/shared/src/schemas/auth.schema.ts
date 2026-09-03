import { z } from "zod";

export const loginRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "请输入用户名")
    .max(64)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "密码至少需要 8 位").max(256),
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
});

export const sessionResponseSchema = z.object({
  user: authUserSchema,
  csrfToken: z.string().min(32),
  expiresAt: z.iso.datetime(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
