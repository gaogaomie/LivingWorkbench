import { type WorkerReply, workerRequestSchema } from "./contracts";
import { createLocalServer } from "./local-server";
import { importWorkspace } from "./workspace-import";

const port = process.parentPort;
if (!port) throw new Error("Desktop backend requires a parent process");
let backend: Awaited<ReturnType<typeof createLocalServer>> | undefined;
let startup: Parameters<typeof createLocalServer>[0] | undefined;
let isBusy = false;

port.on("message", async (event) => {
  const request = workerRequestSchema.safeParse(event.data);
  if (!request.success) return;
  const input = request.data;
  if (isBusy) {
    port.postMessage({ id: input.id, ok: false, error: "操作正在进行，请稍候。" });
    return;
  }
  isBusy = true;
  try {
    let reply: WorkerReply = { id: input.id, ok: true };
    switch (input.action) {
      case "start":
        if (backend) throw new Error("ALREADY_STARTED");
        startup = input;
        backend = await createLocalServer(input);
        reply = { ...reply, origin: await backend.listen(), needsSetup: backend.needsSetup() };
        break;
      case "setup":
        if (!backend?.needsSetup()) throw new Error("ALREADY_INITIALIZED");
        await backend.setup(input.account);
        reply.needsSetup = false;
        break;
      case "settings":
        if (!backend || !startup) throw new Error("NOT_STARTED");
        backend.updateSettings(input.settings);
        startup.settings = input.settings;
        break;
      case "import": {
        if (!backend?.needsSetup() || !startup) throw new Error("IMPORT_REQUIRES_EMPTY_WORKSPACE");
        await backend.server.close();
        backend = undefined;
        try {
          await importWorkspace(input.source, startup.directory);
        } finally {
          backend = await createLocalServer(startup);
        }
        reply = { ...reply, origin: await backend.listen(), needsSetup: backend.needsSetup() };
        break;
      }
      case "stop":
        await backend?.server.close();
        backend = undefined;
        break;
    }
    port.postMessage(reply);
    if (input.action === "stop") process.exit(0);
  } catch {
    // Provider errors and paths never cross the IPC boundary to the renderer.
    if (backend && !backend.server.server.listening && input.action === "import") {
      const origin = await backend.listen();
      port.postMessage({
        id: input.id,
        ok: false,
        origin,
        error: "导入失败，请选择包含 data/daily-life.sqlite 的工作台文件夹，并确认附件可读取。",
      });
    } else {
      port.postMessage({
        id: input.id,
        ok: false,
        error: "本地操作未完成，请检查数据文件或重新启动应用。",
      });
    }
  } finally {
    isBusy = false;
  }
});
