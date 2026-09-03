import { describe, expect, it } from "vitest";
import { createDatabase } from "../db/client";
import { migrateDatabase } from "../db/migrate";
import { AuthService } from "./auth.service";

describe("AuthService.resetAdminCredentials", () => {
  it("changes the credentials and revokes existing sessions", async () => {
    const database = createDatabase(":memory:");
    migrateDatabase(database);
    const authService = new AuthService(database.db, 30);

    try {
      await authService.initializeAdmin("old-admin", "old-password-123");
      const oldLogin = await authService.login("old-admin", "old-password-123");
      expect(oldLogin).not.toBeNull();

      const reset = await authService.resetAdminCredentials("admin", "new-password-123");
      expect(reset.username).toBe("admin");
      expect(await authService.login("old-admin", "old-password-123")).toBeNull();
      expect(await authService.login("admin", "new-password-123")).not.toBeNull();
      expect(authService.getSession(oldLogin?.sessionToken ?? "")).toBeNull();
    } finally {
      database.close();
    }
  });
});
