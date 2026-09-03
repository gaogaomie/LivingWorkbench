import { randomUUID } from "node:crypto";
import type { AccountSummary, AuthUser } from "@daily-life/shared";
import { argon2id, hash, verify } from "argon2";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
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
  user: AuthUser;
  expiresAt: string;
  csrfTokenHash: string;
  sessionIdHash: string;
}

export class AuthService {
  constructor(
    private readonly db: AppDatabase,
    private readonly sessionTtlDays: number,
  ) {}

  async initializeAdmin(username: string, password: string): Promise<AuthUser> {
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
      role: "admin" as const,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    this.db.transaction((tx) => {
      tx.insert(users).values(user).run();
      tx.insert(appSettings).values({ userId: user.id, updatedAt: now }).run();
    });

    return { id: user.id, username: user.username, role: user.role };
  }

  async createMemberAccount(
    username: string,
    password: string,
  ): Promise<{ status: "created"; account: AccountSummary } | { status: "conflict" }> {
    const normalizedUsername = username.trim().toLowerCase();
    const now = new Date().toISOString();
    const account: AccountSummary = {
      id: randomUUID(),
      username: normalizedUsername,
      role: "member",
      createdAt: now,
    };
    const passwordHash = await hash(password, passwordHashOptions);

    const wasCreated = this.db.transaction((tx) => {
      const inserted = tx
        .insert(users)
        .values({
          ...account,
          passwordHash,
          updatedAt: now,
          deletedAt: null,
        })
        .onConflictDoNothing({ target: users.username })
        .returning({ id: users.id })
        .get();
      if (!inserted) {
        return false;
      }
      tx.insert(appSettings).values({ userId: account.id, updatedAt: now }).run();
      return true;
    });

    return wasCreated ? { status: "created", account } : { status: "conflict" };
  }

  listAccounts(): AccountSummary[] {
    return this.db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.role), asc(users.createdAt))
      .limit(100)
      .all();
  }

  async resetAdminCredentials(
    username: string,
    password: string,
  ): Promise<{ id: string; username: string }> {
    const normalizedUsername = username.trim().toLowerCase();
    const existingAdmins = this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)))
      .limit(2)
      .all();

    if (existingAdmins.length !== 1 || !existingAdmins[0]) {
      throw new Error("管理员尚未初始化，或数据库中存在多个管理员账号，无法安全重置。");
    }

    const admin = existingAdmins[0];
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
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        role: users.role,
      })
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
        user: { id: user.id, username: user.username, role: user.role },
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
        role: users.role,
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
      user: { id: result.userId, username: result.username, role: result.role },
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
