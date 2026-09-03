import { randomUUID } from "node:crypto";
import { argon2id, hash, verify } from "argon2";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { AppDatabase } from "../db/client";
import { appSettings, sessions, users } from "../db/schema";
import { createOpaqueToken, hashToken, tokenMatches } from "../security/token";

const passwordHashOptions = {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;

export interface AuthenticatedSession {
  user: { id: string; username: string };
  expiresAt: string;
  csrfTokenHash: string;
  sessionIdHash: string;
}

export class AuthService {
  constructor(
    private readonly db: AppDatabase,
    private readonly sessionTtlDays: number,
  ) {}

  async initializeAdmin(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string }> {
    const normalizedUsername = username.trim().toLowerCase();
    const existing = this.db.select({ id: users.id }).from(users).limit(1).get();

    if (existing) {
      throw new Error("管理员已经初始化，不能创建第二个账号。");
    }

    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      username: normalizedUsername,
      passwordHash: await hash(password, passwordHashOptions),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.db.transaction((tx) => {
      tx.insert(users).values(user).run();
      tx.insert(appSettings).values({ userId: user.id, updatedAt: now }).run();
    });

    return { id: user.id, username: user.username };
  }

  async resetAdminCredentials(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string }> {
    const normalizedUsername = username.trim().toLowerCase();
    const existingUsers = this.db
      .select({ id: users.id })
      .from(users)
      .where(isNull(users.deletedAt))
      .limit(2)
      .all();

    if (existingUsers.length !== 1 || !existingUsers[0]) {
      throw new Error("管理员尚未初始化，或数据库中存在多个有效账号，无法安全重置。");
    }

    const admin = existingUsers[0];
    const now = new Date().toISOString();
    const passwordHash = await hash(password, passwordHashOptions);

    this.db.transaction((tx) => {
      tx.update(users)
        .set({ username: normalizedUsername, passwordHash, updatedAt: now })
        .where(eq(users.id, admin.id))
        .run();
      tx.update(sessions).set({ revokedAt: now }).where(eq(sessions.userId, admin.id)).run();
    });

    return { id: admin.id, username: normalizedUsername };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ sessionToken: string; csrfToken: string; session: AuthenticatedSession } | null> {
    const user = this.db
      .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.username, username.trim().toLowerCase()), isNull(users.deletedAt)))
      .get();

    if (!user || !(await verify(user.passwordHash, password))) {
      return null;
    }

    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtlDays * 86_400_000).toISOString();
    const sessionIdHash = hashToken(sessionToken);
    const csrfTokenHash = hashToken(csrfToken);

    this.db
      .insert(sessions)
      .values({
        idHash: sessionIdHash,
        userId: user.id,
        csrfTokenHash,
        createdAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt,
      })
      .run();

    return {
      sessionToken,
      csrfToken,
      session: {
        user: { id: user.id, username: user.username },
        expiresAt,
        csrfTokenHash,
        sessionIdHash,
      },
    };
  }

  getSession(sessionToken: string, now = new Date()): AuthenticatedSession | null {
    const sessionIdHash = hashToken(sessionToken);
    const result = this.db
      .select({
        userId: users.id,
        username: users.username,
        csrfTokenHash: sessions.csrfTokenHash,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.idHash, sessionIdHash),
          gt(sessions.expiresAt, now.toISOString()),
          isNull(sessions.revokedAt),
          isNull(users.deletedAt),
        ),
      )
      .get();

    if (!result) {
      return null;
    }

    this.db
      .update(sessions)
      .set({ lastSeenAt: now.toISOString() })
      .where(eq(sessions.idHash, sessionIdHash))
      .run();

    return {
      user: { id: result.userId, username: result.username },
      expiresAt: result.expiresAt,
      csrfTokenHash: result.csrfTokenHash,
      sessionIdHash,
    };
  }

  rotateCsrfToken(sessionIdHash: string): string {
    const csrfToken = createOpaqueToken();
    this.db
      .update(sessions)
      .set({ csrfTokenHash: hashToken(csrfToken) })
      .where(eq(sessions.idHash, sessionIdHash))
      .run();
    return csrfToken;
  }

  verifyCsrf(session: AuthenticatedSession, csrfToken: string | undefined): boolean {
    return Boolean(csrfToken && tokenMatches(csrfToken, session.csrfTokenHash));
  }

  revokeSession(sessionIdHash: string): void {
    this.db
      .update(sessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(sessions.idHash, sessionIdHash))
      .run();
  }
}
