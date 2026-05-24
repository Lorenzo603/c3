import { execFile } from 'node:child_process';
import { createConnection } from 'node:net';
import { promisify } from 'node:util';
import type { ProcessSummary } from '../../shared/process';

const execFileAsync = promisify(execFile);

const MONGODB_LOCAL_PORT = 27017;
const MONITORING_TIMEOUT_MS = 500;
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'];

function monitoredActionCapability() {
  return {
    supported: false,
    enabled: false,
    reason: 'MongoDB is monitored only in this milestone; control actions are disabled.'
  };
}

async function isLocalPortListening(port: number): Promise<boolean> {
  const checks = LOOPBACK_HOSTS.map((host) => new Promise<boolean>((resolve) => {
    const socket = createConnection({ host, port });

    const finish = (isListening: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(isListening);
    };

    socket.setTimeout(MONITORING_TIMEOUT_MS);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  }));

  const results = await Promise.all(checks);
  return results.some(Boolean);
}

function parsePid(value: string): number | undefined {
  const pidCandidate = Number.parseInt(value.trim(), 10);
  return Number.isInteger(pidCandidate) ? pidCandidate : undefined;
}

async function readListeningPid(platform: NodeJS.Platform, port: number): Promise<number | undefined> {
  try {
    if (platform === 'darwin' || platform === 'linux') {
      const { stdout } = await execFileAsync('lsof', [
        '-nP',
        `-iTCP:${port}`,
        '-sTCP:LISTEN',
        '-t'
      ]);

      const firstPid = stdout
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0);

      return firstPid ? parsePid(firstPid) : undefined;
    }

    if (platform === 'win32') {
      const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp']);
      const targetPort = `:${port}`;

      const lineWithPid = stdout
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.includes(targetPort) && /LISTEN(?:ING)?\s+\d+$/i.test(line));

      if (!lineWithPid) {
        return undefined;
      }

      const match = lineWithPid.match(/(\d+)\s*$/);
      return match?.[1] ? parsePid(match[1]) : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function buildMonitoredMongoProcess(
  platform: NodeJS.Platform = process.platform
): Promise<ProcessSummary> {
  const isRunning = await isLocalPortListening(MONGODB_LOCAL_PORT);
  const pid = isRunning ? await readListeningPid(platform, MONGODB_LOCAL_PORT) : undefined;

  return {
    id: 'mongodb-local',
    name: 'MongoDB Local',
    source: 'database',
    status: isRunning ? 'running' : 'stopped',
    health: isRunning ? 'healthy' : 'critical',
    pid,
    ports: [MONGODB_LOCAL_PORT],
    description: isRunning
      ? 'Local MongoDB instance detected on localhost:27017'
      : 'Watching for local MongoDB on localhost:27017',
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: monitoredActionCapability(),
      stop: monitoredActionCapability(),
      restart: monitoredActionCapability()
    }
  };
}
