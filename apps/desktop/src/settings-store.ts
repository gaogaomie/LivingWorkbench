import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { type DesktopSettings, desktopSettingsSchema } from "./contracts";

interface Encryption {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}
export class SettingsStore {
  constructor(
    private directory: string,
    private encryption: Encryption,
  ) {}
  async load(): Promise<DesktopSettings> {
    try {
      const encrypted = await readFile(path.join(this.directory, "settings.enc"));
      return desktopSettingsSchema.parse(JSON.parse(this.encryption.decryptString(encrypted)));
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      const initial = {
        sessionSecret: randomBytes(48).toString("hex"),
        deepSeekApiKey: null,
        deepSeekModel: "deepseek-v4-flash",
      };
      await this.save(initial);
      return initial;
    }
  }
  async save(settings: DesktopSettings) {
    if (!this.encryption.isEncryptionAvailable())
      throw new Error("系统安全存储不可用，无法保存配置。");
    const contents = this.encryption.encryptString(
      JSON.stringify(desktopSettingsSchema.parse(settings)),
    );
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(this.directory, "settings.enc.tmp");
    await writeFile(temporary, contents, { mode: 0o600 });
    await rename(temporary, path.join(this.directory, "settings.enc"));
  }
}

export async function importAiSettings(
  source: string,
  settings: DesktopSettings,
): Promise<DesktopSettings> {
  try {
    const env = parseEnv(await readFile(path.join(source, ".env"), "utf8"));
    return desktopSettingsSchema.parse({
      ...settings,
      deepSeekApiKey: env.DEEPSEEK_API_KEY?.trim() || settings.deepSeekApiKey,
      deepSeekModel: env.DEEPSEEK_MODEL?.trim() || settings.deepSeekModel,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return settings;
    throw new Error("无法读取旧工作台的 AI 配置，请在设置中重新填写。");
  }
}
