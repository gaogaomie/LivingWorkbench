import type { DesktopBridge, SettingsView } from "./contracts";

declare global {
  interface Window {
    dailyLifeDesktop: DesktopBridge;
  }
}
const form = document.querySelector("form");
const errorText = document.getElementById("error");
const importButton = document.getElementById("import-button");
let state: SettingsView;
function showError(message: string) {
  if (errorText) errorText.textContent = message;
}
function setBusy(busy: boolean) {
  for (const control of document.querySelectorAll("button, input")) {
    if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement)
      control.disabled = busy;
  }
}
async function initialize() {
  state = await window.dailyLifeDesktop.getState();
  const account = document.getElementById("account-fields");
  if (account instanceof HTMLFieldSetElement) {
    account.hidden = !state.needsSetup;
    account.disabled = !state.needsSetup;
  }
  if (importButton) importButton.hidden = !state.needsSetup;
  const importHint = document.getElementById("import-hint");
  if (importHint) importHint.hidden = !state.needsSetup;
  const model = form?.elements.namedItem("model");
  if (model instanceof HTMLInputElement) model.value = state.model;
  const saveButton = document.getElementById("save-button");
  if (saveButton) saveButton.textContent = state.needsSetup ? "开始我的日常" : "保存设置";
  const heading = document.getElementById("heading");
  if (heading && !state.needsSetup) heading.textContent = "照顾好，你的小小日常。";
  const status = document.getElementById("key-status");
  if (status)
    status.textContent = state.hasApiKey
      ? "已保存密钥。留空可保留，填写新密钥可替换。"
      : "尚未配置 AI 密钥，将使用本地规则摘要。";
  const directory = document.getElementById("data-directory");
  if (directory) directory.textContent = state.directory;
}
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  setBusy(true);
  showError("");
  try {
    const result = await window.dailyLifeDesktop.save({
      apiKey: String(data.get("apiKey") ?? ""),
      clearApiKey: data.get("clearApiKey") === "on",
      model: String(data.get("model") ?? ""),
      ...(state.needsSetup
        ? {
            account: {
              username: String(data.get("username") ?? ""),
              password: String(data.get("password") ?? ""),
            },
          }
        : {}),
    });
    if (!result.ok) showError(result.error ?? "保存失败，请重试。");
  } catch {
    showError("无法连接本地服务，请重新打开应用。");
  } finally {
    setBusy(false);
  }
});
importButton?.addEventListener("click", async () => {
  setBusy(true);
  showError("");
  try {
    const result = await window.dailyLifeDesktop.importWorkspace();
    if (!result.ok && !result.cancelled) showError(result.error ?? "导入失败，请重试。");
  } catch {
    showError("无法导入，请检查原文件是否可读取。");
  } finally {
    setBusy(false);
  }
});
void initialize().catch(() => {
  showError("无法读取本地配置，请重新打开应用。");
  setBusy(true);
});
