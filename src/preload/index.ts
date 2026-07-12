import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type C3DesktopApi,
  type FindProcessByPortRequest,
  type GetProcessListRequest,
  type LaunchShortcutRequest,
  type KillProcessRequest,
  type ProcessCommandRequest
} from '../shared/process';

const api: C3DesktopApi = {
  getProcessList(request: GetProcessListRequest = {}) {
    return ipcRenderer.invoke(IPC_CHANNELS.getProcessList, request);
  },
  sendProcessCommand(request: ProcessCommandRequest) {
    return ipcRenderer.invoke(IPC_CHANNELS.processCommand, request);
  },
  findProcessByPort(request: FindProcessByPortRequest) {
    return ipcRenderer.invoke(IPC_CHANNELS.findProcessByPort, request);
  },
  killProcess(request: KillProcessRequest) {
    return ipcRenderer.invoke(IPC_CHANNELS.killProcess, request);
  },
  launchShortcut(request: LaunchShortcutRequest) {
    return ipcRenderer.invoke(IPC_CHANNELS.launchShortcut, request);
  }
};

contextBridge.exposeInMainWorld('c3Desktop', api);
