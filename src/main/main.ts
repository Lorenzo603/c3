import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import {
  IPC_CHANNELS,
  type GetProcessListRequest,
  type ProcessCommandRequest
} from '../shared/process';
import { createProcessRuntime } from './services/processRuntime';

let mainWindow: BrowserWindow | null = null;
const runtime = createProcessRuntime();

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'C3 Desktop',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.getProcessList,
    async (_event, request?: GetProcessListRequest) => runtime.getProcessList(request ?? {})
  );

  ipcMain.handle(
    IPC_CHANNELS.processCommand,
    async (_event, request: ProcessCommandRequest) => runtime.sendCommand(request)
  );
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
