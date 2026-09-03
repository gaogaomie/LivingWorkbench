import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member"]);

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
  role: userRoleSchema,
});

export const createMemberAccountRequestSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(2, "用户名至少需要 2 位")
      .max(64, "用户名不能超过 64 位")
      .regex(/^[a-zA-Z0-9_-]+$/, "用户名只能包含字母、数字、下划线和连字符")
      .transform((value) => value.toLowerCase()),
    password: z.string().min(8, "密码至少需要 8 位").max(256),
  })
  .strict();

export const accountSummarySchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  role: userRoleSchema,
  createdAt: z.iso.datetime(),
});

export const accountListResponseSchema = z.object({
  items: z.array(accountSummarySchema).max(100),
});

export const sessionResponseSchema = z.object({
  user: authUserSchema,
  csrfToken: z.string().min(32),
  expiresAt: z.iso.datetime(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type CreateMemberAccountRequest = z.infer<typeof createMemberAccountRequestSchema>;
export type AccountSummary = z.infer<typeof accountSummarySchema>;
export type AccountListResponse = z.infer<typeof accountListResponseSchema>;
