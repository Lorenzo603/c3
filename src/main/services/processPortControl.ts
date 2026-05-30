import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  FindProcessByPortRequest,
  FindProcessByPortResponse,
  KillProcessRequest,
  KillProcessResponse,
  PortProcessDetails
} from '../../shared/process';

const execFileAsync = promisify(execFile);

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function parsePid(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseLsofOutput(stdout: string): Omit<PortProcessDetails, 'command'> | undefined {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let currentPid: number | undefined;
  let currentName: string | undefined;
  let currentUser: string | undefined;
  let currentAddress: string | undefined;

  for (const line of lines) {
    const field = line.charAt(0);
    const value = line.slice(1).trim();

    if (field === 'p') {
      const pid = parsePid(value);
      if (pid !== undefined) {
        currentPid = pid;
      }
      continue;
    }

    if (field === 'c' && value.length > 0) {
      currentName = value;
      continue;
    }

    if (field === 'L' && value.length > 0) {
      currentUser = value;
      continue;
    }

    if (field === 'n' && value.length > 0 && currentAddress === undefined) {
      currentAddress = value;
    }
  }

  if (currentPid === undefined || currentName === undefined) {
    return undefined;
  }

  return {
    pid: currentPid,
    name: currentName,
    user: currentUser,
    address: currentAddress
  };
}

async function readCommandLine(pid: number): Promise<string> {
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'command=', '-p', String(pid)]);
    const command = stdout.trim();
    return command.length > 0 ? command : 'Unavailable';
  } catch {
    return 'Unavailable';
  }
}

export async function findProcessByPort(
  request: FindProcessByPortRequest,
  platform: NodeJS.Platform = process.platform
): Promise<FindProcessByPortResponse> {
  const port = request.port;

  if (!isValidPort(port)) {
    return {
      port,
      found: false,
      message: 'Port must be an integer between 1 and 65535.'
    };
  }

  if (platform !== 'darwin' && platform !== 'linux') {
    return {
      port,
      found: false,
      message: `Port lookup is not implemented for platform ${platform}.`
    };
  }

  const command = `lsof -nP -iTCP:${port} -sTCP:LISTEN -FpcLn`;

  try {
    const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-FpcLn']);
    const parsed = parseLsofOutput(stdout);

    if (!parsed) {
      return {
        port,
        found: false,
        message: `No listening process was found on port ${port}.`,
        command,
        output: stdout.trim() || undefined
      };
    }

    const processDetails: PortProcessDetails = {
      ...parsed,
      command: await readCommandLine(parsed.pid)
    };

    return {
      port,
      found: true,
      message: `Found process ${processDetails.name} (PID ${processDetails.pid}) on port ${port}.`,
      process: processDetails,
      command,
      output: stdout.trim() || undefined
    };
  } catch (error) {
    const stderr = error instanceof Error ? error.message : 'Unable to inspect the port.';

    if (stderr.toLowerCase().includes('no such file or directory')) {
      return {
        port,
        found: false,
        message: 'lsof is not available on this machine.',
        command
      };
    }

    return {
      port,
      found: false,
      message: `No listening process was found on port ${port}.`,
      command,
      output: stderr
    };
  }
}

export async function killProcessByPid(request: KillProcessRequest): Promise<KillProcessResponse> {
  const pid = request.pid;

  if (!Number.isInteger(pid) || pid <= 0) {
    return {
      pid,
      accepted: false,
      message: 'PID must be a positive integer.'
    };
  }

  if (pid === process.pid) {
    return {
      pid,
      accepted: false,
      message: 'Refusing to terminate the C3 application process.',
      command: `kill -TERM ${pid}`
    };
  }

  try {
    process.kill(pid, 'SIGTERM');

    return {
      pid,
      accepted: true,
      message: `Termination signal sent to PID ${pid}.`,
      command: `kill -TERM ${pid}`
    };
  } catch (error) {
    const maybeCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;

    if (maybeCode === 'ESRCH') {
      return {
        pid,
        accepted: false,
        message: `PID ${pid} was not found.`,
        command: `kill -TERM ${pid}`
      };
    }

    if (maybeCode === 'EPERM') {
      return {
        pid,
        accepted: false,
        message: `Permission denied while trying to terminate PID ${pid}.`,
        command: `kill -TERM ${pid}`
      };
    }

    return {
      pid,
      accepted: false,
      message: error instanceof Error ? error.message : `Unable to terminate PID ${pid}.`,
      command: `kill -TERM ${pid}`
    };
  }
}
