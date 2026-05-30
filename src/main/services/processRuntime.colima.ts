import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessAction, ProcessSummary } from '../../shared/process';

const execFileAsync = promisify(execFile);

export const COLIMA_PROCESS_ID = 'colima-local';

interface ColimaStatus {
  available: boolean;
  running: boolean;
  details?: string;
}

function readOnlyCapability(reason: string) {
  return {
    supported: false,
    enabled: false,
    reason
  };
}

function enabledCapability(reason?: string) {
  return {
    supported: true,
    enabled: true,
    reason
  };
}

function disabledCapability(reason: string) {
  return {
    supported: true,
    enabled: false,
    reason
  };
}

function errorOutput(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const stdout = 'stdout' in error && typeof error.stdout === 'string' ? error.stdout : '';
  const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr : '';

  return `${stdout}\n${stderr}`.trim();
}

function isCommandMissing(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

function inferRunningStatus(text: string): boolean {
  const normalized = text.toLowerCase();

  if (normalized.includes('not running') || normalized.includes('stopped')) {
    return false;
  }

  if (normalized.includes('running')) {
    return true;
  }

  return false;
}

async function readColimaStatus(): Promise<ColimaStatus> {
  try {
    const { stdout, stderr } = await execFileAsync('colima', ['status']);
    const details = `${stdout}\n${stderr}`.trim();

    return {
      available: true,
      running: inferRunningStatus(details),
      details
    };
  } catch (error) {
    if (isCommandMissing(error)) {
      return {
        available: false,
        running: false,
        details: 'Colima CLI was not found on PATH.'
      };
    }

    const details = errorOutput(error);
    const lower = details.toLowerCase();

    if (lower.includes('not running') || lower.includes('stopped')) {
      return {
        available: true,
        running: false,
        details
      };
    }

    return {
      available: true,
      running: false,
      details: details || 'Unable to determine Colima status.'
    };
  }
}

async function runColima(args: string[]): Promise<void> {
  await execFileAsync('colima', args);
}

export async function buildMonitoredColimaProcess(
  platform: NodeJS.Platform = process.platform
): Promise<ProcessSummary> {
  if (platform !== 'darwin') {
    return {
      id: COLIMA_PROCESS_ID,
      name: 'Colima',
      source: 'docker',
      status: 'unknown',
      health: 'unknown',
      ports: [],
      description: 'Colima monitoring is currently supported on macOS only.',
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: readOnlyCapability('Colima control is supported on macOS only.'),
        stop: readOnlyCapability('Colima control is supported on macOS only.'),
        restart: readOnlyCapability('Colima control is supported on macOS only.')
      }
    };
  }

  const status = await readColimaStatus();

  if (!status.available) {
    return {
      id: COLIMA_PROCESS_ID,
      name: 'Colima',
      source: 'docker',
      status: 'stopped',
      health: 'unknown',
      ports: [],
      description: 'Colima CLI is not installed or not available on PATH.',
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: readOnlyCapability('Install Colima and ensure the colima command is on PATH.'),
        stop: readOnlyCapability('Install Colima and ensure the colima command is on PATH.'),
        restart: readOnlyCapability('Install Colima and ensure the colima command is on PATH.')
      }
    };
  }

  return {
    id: COLIMA_PROCESS_ID,
    name: 'Colima',
    source: 'docker',
    status: status.running ? 'running' : 'stopped',
    health: status.running ? 'healthy' : 'warning',
    ports: [],
    description: status.running
      ? 'Colima instance is running and available.'
      : 'Colima instance is stopped. Use Start to launch it.',
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: status.running
        ? disabledCapability('Colima is already running.')
        : enabledCapability('Start Colima'),
      stop: status.running
        ? enabledCapability('Stop Colima')
        : disabledCapability('Colima is already stopped.'),
      restart: status.running
        ? enabledCapability('Restart Colima')
        : disabledCapability('Start Colima before restarting.')
    }
  };
}

export async function runColimaAction(
  action: ProcessAction,
  platform: NodeJS.Platform = process.platform
): Promise<{ accepted: boolean; message: string }> {
  if (platform !== 'darwin') {
    return {
      accepted: false,
      message: 'Colima control is currently supported on macOS only.'
    };
  }

  const status = await readColimaStatus();

  if (!status.available) {
    return {
      accepted: false,
      message: 'Colima CLI is unavailable. Install Colima and ensure it is on PATH.'
    };
  }

  try {
    if (action === 'start') {
      if (status.running) {
        return {
          accepted: false,
          message: 'Colima is already running.'
        };
      }

      await runColima(['start']);

      return {
        accepted: true,
        message: 'Colima started successfully.'
      };
    }

    if (action === 'stop') {
      if (!status.running) {
        return {
          accepted: false,
          message: 'Colima is already stopped.'
        };
      }

      await runColima(['stop']);

      return {
        accepted: true,
        message: 'Colima stopped successfully.'
      };
    }

    if (!status.running) {
      return {
        accepted: false,
        message: 'Colima is stopped. Start it before restarting.'
      };
    }

    await runColima(['stop']);
    await runColima(['start']);

    return {
      accepted: true,
      message: 'Colima restarted successfully.'
    };
  } catch (error) {
    const details = errorOutput(error);

    return {
      accepted: false,
      message: details || `Failed to ${action} Colima.`
    };
  }
}
