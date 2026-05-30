import { execFile, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ProcessAction, ProcessSummary } from '../../shared/process';

const execFileAsync = promisify(execFile);

let managedCloudSqlProxyPid: number | undefined;

export const CLOUD_SQL_PROXY_PROCESS_ID = 'cloud-sql-proxy-connections';

const CLOUD_SQL_PROXY_SCRIPT_PATH = join(
  homedir(),
  'p',
  'scripts',
  'cloudsqlproxy',
  'open-cloud-sql-proxy-connectons.sh'
);

const CLOUD_SQL_PROXY_SCRIPT_BASENAME = 'open-cloud-sql-proxy-connectons.sh';

interface ScriptRuntimeStatus {
  scriptPath: string;
  available: boolean;
  runningPids: number[];
}

interface ScriptActionResult {
  accepted: boolean;
  message: string;
  command?: string;
  output?: string;
}

function unsupportedActionCapability(reason: string) {
  return {
    supported: false,
    enabled: false,
    reason
  };
}

function enabledActionCapability(reason?: string) {
  return {
    supported: true,
    enabled: true,
    reason
  };
}

function disabledActionCapability(reason: string) {
  return {
    supported: true,
    enabled: false,
    reason
  };
}

function parsePids(stdout: string): number[] {
  return stdout
    .split('\n')
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function buildOutput(stdout: string, stderr: string): string | undefined {
  const output = `${stdout}\n${stderr}`.trim();
  return output.length > 0 ? output : undefined;
}

function errorOutput(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
  const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';

  return `${stdout}\n${stderr}`.trim();
}

async function readPidsByPattern(pattern: string): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync('pgrep', ['-f', pattern]);
    return parsePids(stdout);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    const output = errorOutput(error);
    return output.length > 0 ? parsePids(output) : [];
  }
}

async function readScriptRuntimeStatus(): Promise<ScriptRuntimeStatus> {
  let available = false;

  try {
    await access(CLOUD_SQL_PROXY_SCRIPT_PATH, constants.F_OK | constants.X_OK);
    available = true;
  } catch {
    available = false;
  }

  if (!available) {
    return {
      scriptPath: CLOUD_SQL_PROXY_SCRIPT_PATH,
      available: false,
      runningPids: []
    };
  }

  const pidsFromAbsolutePath = await readPidsByPattern(CLOUD_SQL_PROXY_SCRIPT_PATH);
  const pidsFromBasename = await readPidsByPattern(CLOUD_SQL_PROXY_SCRIPT_BASENAME);
  const uniquePids = [...new Set([...pidsFromAbsolutePath, ...pidsFromBasename])];

  return {
    scriptPath: CLOUD_SQL_PROXY_SCRIPT_PATH,
    available: true,
    runningPids: uniquePids
  };
}

async function runKillByPattern(pattern: string): Promise<{ command: string; output?: string }> {
  const { stdout, stderr } = await execFileAsync('pkill', ['-f', pattern]);

  return {
    command: `pkill -f ${pattern}`,
    output: buildOutput(stdout, stderr)
  };
}

function isCommandMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

function hasNoMatches(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 1);
}

function isProcessNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH');
}

export function stopManagedCloudSqlProxyConnectionsProcess(): ScriptActionResult {
  if (!managedCloudSqlProxyPid) {
    return {
      accepted: false,
      message: 'No managed Cloud SQL Proxy process is currently running.'
    };
  }

  const pidToStop = managedCloudSqlProxyPid;

  try {
    process.kill(-pidToStop, 'SIGTERM');
    managedCloudSqlProxyPid = undefined;

    return {
      accepted: true,
      message: 'Cloud SQL Proxy script stopped successfully.',
      command: `kill -TERM -${pidToStop}`,
      output: `Stopped managed process group ${pidToStop}`
    };
  } catch (error) {
    if (isProcessNotFound(error)) {
      managedCloudSqlProxyPid = undefined;

      return {
        accepted: true,
        message: 'Managed Cloud SQL Proxy process was already stopped.',
        command: `kill -TERM -${pidToStop}`,
        output: 'Process group was not found (ESRCH).'
      };
    }

    const details = errorOutput(error);

    return {
      accepted: false,
      message: details || 'Failed to stop managed Cloud SQL Proxy process.',
      command: `kill -TERM -${pidToStop}`,
      output: details || undefined
    };
  }
}

export async function buildMonitoredCloudSqlProxyConnectionsProcess(
  platform: NodeJS.Platform = process.platform
): Promise<ProcessSummary> {
  if (platform === 'win32') {
    return {
      id: CLOUD_SQL_PROXY_PROCESS_ID,
      name: 'Cloud SQL Proxy Connections',
      source: 'scripts',
      status: 'unknown',
      health: 'unknown',
      ports: [],
      description: 'Cloud SQL Proxy script control is supported on macOS/Linux.',
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: unsupportedActionCapability('Scripts runtime is unsupported on Windows.'),
        stop: unsupportedActionCapability('Scripts runtime is unsupported on Windows.')
      }
    };
  }

  const status = await readScriptRuntimeStatus();
  if (managedCloudSqlProxyPid && !status.runningPids.includes(managedCloudSqlProxyPid)) {
    managedCloudSqlProxyPid = undefined;
  }

  const isRunning = status.runningPids.length > 0;

  if (!status.available) {
    return {
      id: CLOUD_SQL_PROXY_PROCESS_ID,
      name: 'Cloud SQL Proxy Connections',
      source: 'scripts',
      status: 'stopped',
      health: 'unknown',
      ports: [],
      description: `Script not found: ${status.scriptPath}`,
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: unsupportedActionCapability(`Script is missing: ${status.scriptPath}`),
        stop: unsupportedActionCapability(`Script is missing: ${status.scriptPath}`)
      }
    };
  }

  return {
    id: CLOUD_SQL_PROXY_PROCESS_ID,
    name: 'Cloud SQL Proxy Connections',
    source: 'scripts',
    status: isRunning ? 'running' : 'stopped',
    health: isRunning ? 'healthy' : 'warning',
    pid: status.runningPids[0],
    ports: [],
    description: isRunning
      ? `Cloud SQL Proxy script is running (${status.runningPids.length} process${status.runningPids.length > 1 ? 'es' : ''}).`
      : 'Cloud SQL Proxy script is stopped.',
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: isRunning
        ? disabledActionCapability('Script is already running.')
        : enabledActionCapability('Start script'),
      stop: isRunning
        ? enabledActionCapability('Stop script')
        : disabledActionCapability('Script is already stopped.')
    }
  };
}

export async function runCloudSqlProxyConnectionsAction(
  action: ProcessAction,
  platform: NodeJS.Platform = process.platform
): Promise<ScriptActionResult> {
  if (platform === 'win32') {
    return {
      accepted: false,
      message: 'Cloud SQL Proxy script control is supported on macOS/Linux only.'
    };
  }

  const status = await readScriptRuntimeStatus();

  if (!status.available) {
    return {
      accepted: false,
      message: `Script not found: ${status.scriptPath}`
    };
  }

  const isRunning = status.runningPids.length > 0;

  if (action === 'start') {
    if (isRunning) {
      return {
        accepted: false,
        message: 'Cloud SQL Proxy script is already running.'
      };
    }

    try {
      const child = spawn('/bin/sh', [status.scriptPath], {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      if (child.pid && child.pid > 0) {
        managedCloudSqlProxyPid = child.pid;
      }

      return {
        accepted: true,
        message: 'Cloud SQL Proxy script started successfully.',
        command: `/bin/sh ${status.scriptPath}`,
        output: child.pid ? `Spawned process PID ${child.pid}` : undefined
      };
    } catch (error) {
      const details = errorOutput(error);

      return {
        accepted: false,
        message: details || 'Failed to start Cloud SQL Proxy script.',
        output: details || undefined
      };
    }
  }

  if (!isRunning) {
    return {
      accepted: false,
      message: 'Cloud SQL Proxy script is already stopped.'
    };
  }

  try {
    if (managedCloudSqlProxyPid) {
      const managedStopResult = stopManagedCloudSqlProxyConnectionsProcess();

      if (managedStopResult.accepted) {
        return managedStopResult;
      }
    }

    let stopResult: { command: string; output?: string };

    try {
      stopResult = await runKillByPattern(status.scriptPath);
    } catch (error) {
      if (isCommandMissing(error)) {
        throw error;
      }

      if (!hasNoMatches(error)) {
        throw error;
      }

      stopResult = await runKillByPattern(CLOUD_SQL_PROXY_SCRIPT_BASENAME);
    }

    return {
      accepted: true,
      message: 'Cloud SQL Proxy script stopped successfully.',
      command: stopResult.command,
      output: stopResult.output
    };
  } catch (error) {
    const details = errorOutput(error);

    return {
      accepted: false,
      message: details || 'Failed to stop Cloud SQL Proxy script.',
      output: details || undefined
    };
  }
}
