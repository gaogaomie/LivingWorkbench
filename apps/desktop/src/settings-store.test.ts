import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { importAiSettings, SettingsStore } from "./settings-store";

const directories: string[] = [];
async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "desktop-settings-"));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
const encryption = {
  isEncryptionAvailable: () => true,
  encryptString: (value: string) => Buffer.from(Buffer.from(value).map((byte) => byte ^ 0x5a)),
  decryptString: (value: Buffer) => Buffer.from(value.map((byte) => byte ^ 0x5a)).toString(),
};
it("persists secrets through the supplied system encryption without storing plaintext", async () => {
  const directory = await fixture();
  const store = new SettingsStore(directory, encryption);
  const initial = await store.load();
  const configured = { ...initial, deepSeekApiKey: "private-test-key-123456789" };
  await store.save(configured);
  expect(await store.load()).toEqual(configured);
  expect((await readFile(path.join(directory, "settings.enc"))).toString()).not.toContain(
    configured.deepSeekApiKey,
  );
});
it("does not silently replace corrupted settings or save plaintext when encryption is unavailable", async () => {
  const directory = await fixture();
  const store = new SettingsStore(directory, { ...encryption, isEncryptionAvailable: () => false });
  await expect(store.load()).rejects.toThrow("系统安全存储不可用");
  await writeFile(path.join(directory, "settings.enc"), "corrupt");
  await expect(new SettingsStore(directory, encryption).load()).rejects.toThrow();
});
it("imports only DeepSeek configuration and keeps the new desktop session secret", async () => {
  const directory = await fixture();
  const settings = await new SettingsStore(directory, encryption).load();
  await writeFile(
    path.join(directory, ".env"),
    "DEEPSEEK_API_KEY=private-test-key-123456789\nDEEPSEEK_MODEL=deepseek-v4-flash\nSESSION_SECRET=do-not-import\n",
  );
  expect(await importAiSettings(directory, settings)).toEqual({
    ...settings,
    deepSeekApiKey: "private-test-key-123456789",
  });
});
