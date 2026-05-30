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

interface ColimaCommandResult {
  command: string;
  output?: string;
}

interface ColimaActionResult {
  accepted: boolean;
  message: string;
  command?: string;
  output?: string;
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

async function runColima(args: string[]): Promise<ColimaCommandResult> {
  const { stdout, stderr } = await execFileAsync('colima', args);
  const output = `${stdout}\n${stderr}`.trim();

  return {
    command: `colima ${args.join(' ')}`,
    output: output.length > 0 ? output : undefined
  };
}

export async function buildMonitoredColimaProcess(
  platform: NodeJS.Platform = process.platform
): Promise<ProcessSummary> {
  if (platform !== 'darwin') {
    return {
      id: COLIMA_PROCESS_ID,
      name: 'Colima',
      logoPath: '/process-logos/colima.png',
      source: 'docker',
      status: 'unknown',
      health: 'unknown',
      ports: [],
      description: 'Colima monitoring is currently supported on macOS only.',
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: readOnlyCapability('Colima control is supported on macOS only.'),
        stop: readOnlyCapability('Colima control is supported on macOS only.')
      }
    };
  }

  const status = await readColimaStatus();

  if (!status.available) {
    return {
      id: COLIMA_PROCESS_ID,
      name: 'Colima',
      logoPath: '/process-logos/colima.png',
      source: 'docker',
      status: 'stopped',
      health: 'unknown',
      ports: [],
      description: 'Colima CLI is not installed or not available on PATH.',
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: readOnlyCapability('Install Colima and ensure the colima command is on PATH.'),
        stop: readOnlyCapability('Install Colima and ensure the colima command is on PATH.')
      }
    };
  }

  return {
    id: COLIMA_PROCESS_ID,
    name: 'Colima',
    logoPath: '/process-logos/colima.png',
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
        : disabledCapability('Colima is already stopped.')
    }
  };
}

export async function runColimaAction(
  action: ProcessAction,
  platform: NodeJS.Platform = process.platform
): Promise<ColimaActionResult> {
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

      const result = await runColima(['start']);

      return {
        accepted: true,
        message: 'Colima started successfully.',
        command: result.command,
        output: result.output
      };
    }

    if (action === 'stop') {
      if (!status.running) {
        return {
          accepted: false,
          message: 'Colima is already stopped.'
        };
      }

      const result = await runColima(['stop']);

      return {
        accepted: true,
        message: 'Colima stopped successfully.',
        command: result.command,
        output: result.output
      };
    }

    return {
      accepted: false,
      message: `Unsupported Colima action: ${action}`
    };
  } catch (error) {
    const details = errorOutput(error);

    return {
      accepted: false,
      message: details || `Failed to ${action} Colima.`,
      output: details || undefined
    };
  }
}
