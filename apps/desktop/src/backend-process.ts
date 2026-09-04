import path from "node:path";
import { type UtilityProcess, utilityProcess } from "electron";
import { type WorkerCommand, type WorkerReply, workerReplySchema } from "./contracts";

export class BackendProcess {
  private child: UtilityProcess;
  private nextId = 0;
  private pending = new Map<
    number,
    {
      resolve: (reply: WorkerReply) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private stopping = false;
  constructor(directory: string, onUnexpectedExit: () => void) {
    this.child = utilityProcess.fork(path.join(directory, "backend-worker.mjs"), [], {
      serviceName: "日常集本地服务",
      stdio: "pipe",
    });
    this.child.on("message", (value: unknown) => {
      const parsed = workerReplySchema.safeParse(value);
      if (!parsed.success) return;
      const request = this.pending.get(parsed.data.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(parsed.data.id);
      request.resolve(parsed.data);
    });
    this.child.on("exit", () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error("本地服务已退出，请重新启动应用。"));
      }
      this.pending.clear();
      if (!this.stopping) onUnexpectedExit();
    });
    // Consume pipes without persisting request data or credentials in desktop logs.
    this.child.stdout?.resume();
    this.child.stderr?.resume();
  }
  send(command: WorkerCommand): Promise<WorkerReply> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("本地服务响应超时，请重新启动应用。"));
      }, 60_000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.postMessage({ ...command, id });
    });
  }
  async stop() {
    this.stopping = true;
    const deadline = setTimeout(() => this.child.kill(), 5_000);
    try {
      await this.send({ action: "stop" });
    } finally {
      clearTimeout(deadline);
      this.child.kill();
    }
  }
}
