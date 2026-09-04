import { randomBytes } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  app,
  BrowserWindow,
  dialog,
  type IpcMainInvokeEvent,
  ipcMain,
  Menu,
  safeStorage,
  session,
  shell,
} from "electron";
import { BackendProcess } from "./backend-process";
import { type DesktopSettings, type SettingsView, saveSettingsSchema } from "./contracts";
import { importAiSettings, SettingsStore } from "./settings-store";

app.setName("日常集");
const directoryArgument = process.argv.find((argument) =>
  argument.startsWith("--daily-life-data-dir="),
);
const directory = directoryArgument
  ? path.resolve(directoryArgument.slice("--daily-life-data-dir=".length))
  : path.join(app.getPath("appData"), "DailyLifeWorkbench");
app.setPath("userData", directory);
const hasLock = app.requestSingleInstanceLock();
if (!hasLock) app.quit();

let mainWindow: BrowserWindow | undefined;
let settingsWindow: BrowserWindow | undefined;
let backend: BackendProcess | undefined;
let settings: DesktopSettings;
let store: SettingsStore;
let origin = "";
let needsSetup = true;
let isSaving = false;
let isQuitting = false;
const token = randomBytes(32).toString("hex");
const resourceRoot = path.join(app.getAppPath(), "dist");
const setupUrl = pathToFileURL(path.join(resourceRoot, "ui/setup.html")).href;

function verifySettingsSender(event: IpcMainInvokeEvent) {
  if (
    !settingsWindow ||
    event.sender !== settingsWindow.webContents ||
    event.senderFrame !== event.sender.mainFrame ||
    event.senderFrame.url !== setupUrl
  ) {
    throw new Error("不允许访问桌面配置。");
  }
}

function showSettings() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 780,
    height: 780,
    minWidth: 580,
    minHeight: 620,
    title: needsSetup ? "欢迎来到日常集" : "日常集设置",
    backgroundColor: "#eef4e5",
    show: false,
    webPreferences: {
      preload: path.join(resourceRoot, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  settingsWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== setupUrl) event.preventDefault();
  });
  settingsWindow.on("ready-to-show", () => settingsWindow?.show());
  settingsWindow.on("closed", () => {
    settingsWindow = undefined;
  });
  void settingsWindow.loadURL(setupUrl).catch(showStartupError);
}

function showWorkbench() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 760,
    minHeight: 600,
    title: "日常集",
    backgroundColor: "#bbe0c9",
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${origin}/`)) event.preventDefault();
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
  void mainWindow.loadURL(origin).catch(showStartupError);
}

function showStartupError() {
  dialog.showErrorBox(
    "日常集未能启动",
    "本地服务或数据目录无法打开。请确认目录可写，关闭其他实例后重试。你的数据仍保留在应用数据目录中。",
  );
  app.quit();
}

function installMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "日常集",
        submenu: [
          { role: "about" },
          { label: "设置…", accelerator: "CmdOrCtrl+,", click: showSettings },
          {
            label: "打开数据文件夹",
            click: () => {
              void shell.openPath(directory).then((error) => {
                if (error) dialog.showErrorBox("无法打开文件夹", "请检查应用数据目录是否可访问。");
              });
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      {
        label: "显示",
        submenu: [
          { role: "reload" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
    ]),
  );
}

function installSettingsHandlers() {
  ipcMain.handle("desktop:state", (event): SettingsView => {
    verifySettingsSender(event);
    return {
      needsSetup,
      hasApiKey: Boolean(settings.deepSeekApiKey),
      model: settings.deepSeekModel,
      directory,
    };
  });
  ipcMain.handle("desktop:save", async (event, value: unknown) => {
    verifySettingsSender(event);
    const parsed = saveSettingsSchema.safeParse(value);
    if (!parsed.success) return { ok: false, error: "请检查账号、密码和模型配置。" };
    if (isSaving || !backend) return { ok: false, error: "请等待当前操作完成。" };
    isSaving = true;
    try {
      const input = parsed.data;
      const nextSettings = {
        ...settings,
        deepSeekApiKey: input.clearApiKey ? null : input.apiKey || settings.deepSeekApiKey,
        deepSeekModel: input.model,
      };
      if (nextSettings.deepSeekApiKey && nextSettings.deepSeekApiKey.length < 20)
        return { ok: false, error: "API Key 格式不正确。" };
      if (needsSetup && !input.account) return { ok: false, error: "请先创建本地账号。" };
      await store.save(nextSettings);
      const updated = await backend.send({ action: "settings", settings: nextSettings });
      if (!updated.ok) throw new Error("UPDATE_FAILED");
      settings = nextSettings;
      if (needsSetup && input.account) {
        const result = await backend.send({ action: "setup", account: input.account });
        if (!result.ok) return { ok: false, error: result.error };
        needsSetup = false;
      }
      showWorkbench();
      settingsWindow?.close();
      return { ok: true };
    } catch {
      return { ok: false, error: "保存失败，请检查系统安全存储和数据目录权限后重试。" };
    } finally {
      isSaving = false;
    }
  });
  ipcMain.handle("desktop:import", async (event) => {
    verifySettingsSender(event);
    if (!needsSetup || isSaving || !backend || !settingsWindow)
      return { ok: false, error: "仅支持在首次使用时导入。" };
    isSaving = true;
    try {
      const selection = await dialog.showOpenDialog(settingsWindow, {
        title: "选择原工作台文件夹（包含 data 和 uploads）",
        properties: ["openDirectory"],
      });
      const source = selection.filePaths[0];
      if (selection.canceled || !source) return { ok: false, cancelled: true };
      const importedSettings = await importAiSettings(source, settings);
      // Verify secure storage before committing the database import.
      await store.save(importedSettings);
      settings = importedSettings;
      await backend.send({ action: "settings", settings });
      const result = await backend.send({ action: "import", source });
      if (result.origin) origin = result.origin;
      if (!result.ok) return { ok: false, error: result.error };
      needsSetup = result.needsSetup ?? true;
      if (needsSetup) return { ok: false, error: "导入文件没有可用账号。" };
      showWorkbench();
      settingsWindow.close();
      return { ok: true };
    } catch {
      return { ok: false, error: "导入未完成，请检查原工作台目录及 .env 配置。" };
    } finally {
      isSaving = false;
    }
  });
}

if (hasLock) {
  app.on("second-instance", () => {
    if (needsSetup) showSettings();
    else showWorkbench();
  });
  app.on("activate", () => {
    if (origin) {
      if (needsSetup) showSettings();
      else showWorkbench();
    }
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" || needsSetup) app.quit();
  });
  app.on("before-quit", (event) => {
    if (isQuitting) return;
    isQuitting = true;
    if (!backend) return;
    event.preventDefault();
    void backend.stop().then(
      () => app.quit(),
      () => app.exit(1),
    );
  });
  void app
    .whenReady()
    .then(async () => {
      store = new SettingsStore(directory, safeStorage);
      settings = await store.load();
      session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = details.requestHeaders;
        if (origin && details.url.startsWith(`${origin}/`)) headers["x-daily-life-desktop"] = token;
        callback({ requestHeaders: headers });
      });
      backend = new BackendProcess(resourceRoot, () => {
        if (!isQuitting) showStartupError();
      });
      const ready = await backend.send({
        action: "start",
        directory,
        webRoot: path.join(resourceRoot, "web"),
        token,
        settings,
      });
      if (!ready.ok || !ready.origin) throw new Error("START_FAILED");
      origin = ready.origin;
      needsSetup = ready.needsSetup ?? true;
      installSettingsHandlers();
      installMenu();
      if (needsSetup) showSettings();
      else showWorkbench();
    })
    .catch(showStartupError);
}
