import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type C3DesktopApi,
  type GetProcessListRequest,
  type ProcessCommandRequest
} from '../shared/process';

const api: C3DesktopApi = {
  getProcessList(request: GetProcessListRequest = {}) {
    return ipcRenderer.invoke(IPC_CHANNELS.getProcessList, request);
  },
  sendProcessCommand(request: ProcessCommandRequest) {
    return ipcRenderer.invoke(IPC_CHANNELS.processCommand, request);
  }
};

contextBridge.exposeInMainWorld('c3Desktop', api);
