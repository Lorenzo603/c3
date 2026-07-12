import { app, BrowserWindow, ipcMain } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  IPC_CHANNELS,
  type FindProcessByPortRequest,
  type GetProcessListRequest,
  type LaunchShortcutRequest,
  type LaunchShortcutResponse,
  type KillProcessRequest,
  type ProcessCommandRequest,
  type ShortcutId
} from '../shared/process';
import { createProcessRuntime } from './services/processRuntime';
import {
  findProcessByPort,
  killProcessByPid
} from './services/processPortControl';
import { stopManagedCloudSqlProxyConnectionsProcess } from './services/processRuntime.script';

let mainWindow: BrowserWindow | null = null;
let hasShutdownCleanupRun = false;

function runShutdownCleanup(): void {
  if (hasShutdownCleanupRun) {
    return;
  }

  hasShutdownCleanupRun = true;

  const stopResult = stopManagedCloudSqlProxyConnectionsProcess();
  if (!stopResult.accepted) {
    return;
  }

  if (stopResult.command) {
    console.info(`[shutdown] ${stopResult.command}`);
  }

  if (stopResult.output) {
    console.info(`[shutdown] ${stopResult.output}`);
  }
}

function resolveRuntimeMode() {
  const hasTestFlag = process.argv.includes('--test-mode');
  const envMode = process.env.C3_TEST_MODE;

  if (hasTestFlag || envMode === '1' || envMode === 'true') {
    return 'test' as const;
  }

  return 'real' as const;
}

const runtime = createProcessRuntime({ mode: resolveRuntimeMode() });

const OPEN_BRUNO_CRM_APPS_SCRIPT = `tell application "iTerm2"
  activate

  if (count of windows) = 0 then
    create window with default profile
  else
    tell current window
      create tab with default profile
    end tell
  end if

  tell current session of current window
    set name to "New Tab"
    write text "cd ~/p/gitlab/lxitcrm/crm-microservices/api-bruno-crmapps; code ."
  end tell
end tell`;

interface ShortcutExecutionPlan {
  command: string;
  args: string[];
  commandPreview: string;
  successMessage: string;
  requiresMacOs?: boolean;
}

function resolveShortcutExecutionPlan(shortcutId: ShortcutId): ShortcutExecutionPlan | undefined {
  switch (shortcutId) {
    case 'open-bruno-crmapps':
      return {
        command: 'osascript',
        args: ['-e', OPEN_BRUNO_CRM_APPS_SCRIPT],
        commandPreview: `osascript -e '${OPEN_BRUNO_CRM_APPS_SCRIPT}'`,
        successMessage: 'Shortcut launched in iTerm2.',
        requiresMacOs: true
      };
    case 'open-vscode-lxitcrm':
      return {
        command: 'zsh',
        args: ['-lc', 'code ~/p/gitlab/lxitcrm'],
        commandPreview: 'code ~/p/gitlab/lxitcrm',
        successMessage: 'VS Code opened for ~/p/gitlab/lxitcrm.'
      };
    case 'open-vscode-crmsapp':
      return {
        command: 'zsh',
        args: ['-lc', 'code ~/p/gitlab/lxitcrm/crmsapp'],
        commandPreview: 'code ~/p/gitlab/lxitcrm/crmsapp',
        successMessage: 'VS Code opened for ~/p/gitlab/lxitcrm/crmsapp.'
      };
    case 'open-vscode-one-cst':
      return {
        command: 'zsh',
        args: ['-lc', 'code ~/p/gitlab/lxitcrm/one-cst'],
        commandPreview: 'code ~/p/gitlab/lxitcrm/one-cst',
        successMessage: 'VS Code opened for ~/p/gitlab/lxitcrm/one-cst.'
      };
    default:
      return undefined;
  }
}

function createShortcutCommandString(shortcutId: ShortcutId): string {
  const executionPlan = resolveShortcutExecutionPlan(shortcutId);
  return executionPlan?.commandPreview ?? 'shortcut command unavailable';
}

async function launchShortcut(request: LaunchShortcutRequest): Promise<LaunchShortcutResponse> {
  const { shortcutId } = request;

  const executionPlan = resolveShortcutExecutionPlan(shortcutId);

  if (!executionPlan) {
    return {
      shortcutId,
      accepted: false,
      message: `Unknown shortcut id: ${shortcutId}.`
    };
  }

  if (executionPlan.requiresMacOs && process.platform !== 'darwin') {
    return {
      shortcutId,
      accepted: false,
      message: 'Shortcuts are currently supported on macOS only.',
      command: executionPlan.commandPreview
    };
  }

  return new Promise((resolve) => {
    execFile(executionPlan.command, executionPlan.args, (error, stdout, stderr) => {
      if (error) {
        resolve({
          shortcutId,
          accepted: false,
          message: `Failed to launch shortcut: ${error.message}`,
          command: executionPlan.commandPreview,
          output: stderr.trim() || stdout.trim() || undefined
        });
        return;
      }

      resolve({
        shortcutId,
        accepted: true,
        message: executionPlan.successMessage,
        command: executionPlan.commandPreview,
        output: stdout.trim() || undefined
      });
    });
  });
}

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
    width: 1420,
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

  ipcMain.handle(
    IPC_CHANNELS.findProcessByPort,
    async (_event, request: FindProcessByPortRequest) => findProcessByPort(request)
  );

  ipcMain.handle(
    IPC_CHANNELS.killProcess,
    async (_event, request: KillProcessRequest) => killProcessByPid(request)
  );

  ipcMain.handle(
    IPC_CHANNELS.launchShortcut,
    async (_event, request: LaunchShortcutRequest) => launchShortcut(request)
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
  runShutdownCleanup();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  runShutdownCleanup();
});
