import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts";

const bridge: DesktopBridge = {
  getState: () => ipcRenderer.invoke("desktop:state"),
  save: (input) => ipcRenderer.invoke("desktop:save", input),
  importWorkspace: () => ipcRenderer.invoke("desktop:import"),
};
contextBridge.exposeInMainWorld("dailyLifeDesktop", bridge);
