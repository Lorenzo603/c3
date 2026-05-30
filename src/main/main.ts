import { app, BrowserWindow, ipcMain } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  IPC_CHANNELS,
  type GetProcessListRequest,
  type ProcessCommandRequest
} from '../shared/process';
import { createProcessRuntime } from './services/processRuntime';

let mainWindow: BrowserWindow | null = null;

function resolveRuntimeMode() {
  const hasTestFlag = process.argv.includes('--test-mode');
  const envMode = process.env.C3_TEST_MODE;

  if (hasTestFlag || envMode === '1' || envMode === 'true') {
    return 'test' as const;
  }

  return 'real' as const;
}

const runtime = createProcessRuntime({ mode: resolveRuntimeMode() });

function resolvePreloadPath(): string {
  const defaultPath = join(__dirname, '../preload/index.mjs');
  const candidates = [
    defaultPath,
    join(__dirname, '../preload/index.js'),
    join(__dirname, '../preload/index.cjs')
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? defaultPath;
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'C3 - Command and Control Cockpit',
    webPreferences: {
      preload: resolvePreloadPath(),
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
