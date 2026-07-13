import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessAction, ProcessSummary } from '../../shared/process';

const execFileAsync = promisify(execFile);

const POSTGRES_DOCKER_PORT = 5432;
const MYSQL_DOCKER_PORT = 3306;
const REDIS_DOCKER_PORT = 6379;
const QDRANT_DOCKER_HTTP_PORT = 6333;
const QDRANT_DOCKER_GRPC_PORT = 6334;
const COLIMA_NOT_STARTED_MESSAGE = 'Colima not started';
const DOCKER_UNAVAILABLE_REASON = 'Colima not started';

export const DOCKER_POSTGRES_PROCESS_ID = 'docker-postgres';
export const DOCKER_MYSQL_PROCESS_ID = 'docker-mysql';
export const DOCKER_REDIS_PROCESS_ID = 'docker-redis';
export const DOCKER_QDRANT_PROCESS_ID = 'docker-qdrant';

interface DockerProcessConfig {
  id:
    | typeof DOCKER_POSTGRES_PROCESS_ID
    | typeof DOCKER_MYSQL_PROCESS_ID
    | typeof DOCKER_REDIS_PROCESS_ID
    | typeof DOCKER_QDRANT_PROCESS_ID;
  name: string;
  logoPath: string;
  ports: number[];
  matchHints: string[];
}

const DOCKER_PROCESS_CONFIGS: DockerProcessConfig[] = [
  {
    id: DOCKER_POSTGRES_PROCESS_ID,
    name: 'PostgreSQL (Docker)',
    logoPath: '/process-logos/postgresql.svg',
    ports: [POSTGRES_DOCKER_PORT],
    matchHints: ['postgres', 'postgis']
  },
  {
    id: DOCKER_MYSQL_PROCESS_ID,
    name: 'MySQL (Docker)',
    logoPath: '/process-logos/mysql.svg',
    ports: [MYSQL_DOCKER_PORT],
    matchHints: ['mysql', 'mariadb']
  },
  {
    id: DOCKER_REDIS_PROCESS_ID,
    name: 'Redis (Docker)',
    logoPath: '/process-logos/redis.png',
    ports: [REDIS_DOCKER_PORT],
    matchHints: ['redis']
  },
  {
    id: DOCKER_QDRANT_PROCESS_ID,
    name: 'Qdrant (Docker)',
    logoPath: '/process-logos/qdrant.svg',
    ports: [QDRANT_DOCKER_HTTP_PORT, QDRANT_DOCKER_GRPC_PORT],
    matchHints: ['qdrant']
  }
];

interface DockerContainerSummary {
  id: string;
  name: string;
  image: string;
  ports: string;
  status: string;
  running: boolean;
}

interface DockerRuntimeState {
  available: boolean;
  containers: DockerContainerSummary[];
}

interface DockerCommandResult {
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

function inferContainerRunning(status: string): boolean {
  return /^up\b/i.test(status.trim());
}

function parseProcessEntry(
  line: string
): Partial<DockerContainerSummary> & {
  ID?: string;
  Names?: string;
  Image?: string;
  Ports?: string;
  Status?: string;
} {
  return JSON.parse(line) as Partial<DockerContainerSummary> & {
    ID?: string;
    Names?: string;
    Image?: string;
    Ports?: string;
    Status?: string;
  };
}

async function readDockerRuntimeState(): Promise<DockerRuntimeState> {
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '-a', '--format', '{{json .}}']);

    const containers = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parseProcessEntry(line))
      .map((entry) => ({
        id: entry.ID ?? '',
        name: entry.Names ?? '',
        image: entry.Image ?? '',
        ports: entry.Ports ?? '',
        status: entry.Status ?? '',
        running: inferContainerRunning(entry.Status ?? '')
      }));

    return {
      available: true,
      containers
    };
  } catch {
    return {
      available: false,
      containers: []
    };
  }
}

function findContainerByPort(containers: DockerContainerSummary[], port: number): DockerContainerSummary | undefined {
  const targetToken = `:${port}->`;
  const barePortToken = `${port}/tcp`;

  return containers.find((container) => {
    const ports = container.ports.toLowerCase();
    return ports.includes(targetToken) || ports.includes(barePortToken);
  });
}

function findContainerByPorts(
  containers: DockerContainerSummary[],
  ports: number[]
): DockerContainerSummary | undefined {
  for (const port of ports) {
    const container = findContainerByPort(containers, port);

    if (container) {
      return container;
    }
  }

  return undefined;
}

function findContainerByHints(
  containers: DockerContainerSummary[],
  hints: string[]
): DockerContainerSummary | undefined {
  return containers.find((container) => {
    const name = container.name.toLowerCase();
    const image = container.image.toLowerCase();

    return hints.some((hint) => name.includes(hint) || image.includes(hint));
  });
}

function findContainerForConfig(
  containers: DockerContainerSummary[],
  config: DockerProcessConfig
): DockerContainerSummary | undefined {
  return (
    findContainerByPorts(containers, config.ports) ??
    findContainerByHints(containers, config.matchHints)
  );
}

function findProcessConfigById(processId: string): DockerProcessConfig | undefined {
  return DOCKER_PROCESS_CONFIGS.find((config) => config.id === processId);
}

function buildDockerOutput(stdout: string, stderr: string): string | undefined {
  const output = `${stdout}\n${stderr}`.trim();
  return output.length > 0 ? output : undefined;
}

async function runDockerCommand(args: string[]): Promise<{ command: string; output?: string }> {
  const { stdout, stderr } = await execFileAsync('docker', args);

  return {
    command: `docker ${args.join(' ')}`,
    output: buildDockerOutput(stdout, stderr)
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

function buildDockerProcessSummary(
  runtimeState: DockerRuntimeState,
  config: DockerProcessConfig
): ProcessSummary {
  const portsLabel = config.ports.join(',');

  if (!runtimeState.available) {
    return {
      id: config.id,
      name: config.name,
      logoPath: config.logoPath,
      source: 'docker',
      status: 'stopped',
      health: 'warning',
      ports: config.ports,
      description: COLIMA_NOT_STARTED_MESSAGE,
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: unsupportedActionCapability(DOCKER_UNAVAILABLE_REASON),
        stop: unsupportedActionCapability(DOCKER_UNAVAILABLE_REASON)
      }
    };
  }

  const container = findContainerForConfig(runtimeState.containers, config);
  const hasContainer = container !== undefined;
  const isRunning = container?.running ?? false;

  return {
    id: config.id,
    name: config.name,
    logoPath: config.logoPath,
    source: 'docker',
    status: isRunning ? 'running' : 'stopped',
    health: hasContainer ? (isRunning ? 'healthy' : 'warning') : 'critical',
    ports: config.ports,
    description: hasContainer
      ? isRunning
        ? `Running in Docker container ${container.name} (${container.image}) on ports ${portsLabel}`
        : `Docker container ${container.name} is stopped on ports ${portsLabel}`
      : `Watching Docker containers on ports ${portsLabel}`,
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: !hasContainer
        ? unsupportedActionCapability(`No Docker container found exposing ports ${portsLabel}.`)
        : isRunning
          ? disabledActionCapability('Container is already running.')
          : enabledActionCapability('Start container'),
      stop: !hasContainer
        ? unsupportedActionCapability(`No Docker container found exposing ports ${portsLabel}.`)
        : isRunning
          ? enabledActionCapability('Stop container')
          : disabledActionCapability('Container is already stopped.')
    }
  };
}

export async function buildMonitoredDockerProcesses(): Promise<ProcessSummary[]> {
  const runtimeState = await readDockerRuntimeState();

  return DOCKER_PROCESS_CONFIGS.map((config) => buildDockerProcessSummary(runtimeState, config));
}

export function isDockerProcessId(
  processId: string
): processId is typeof DOCKER_POSTGRES_PROCESS_ID | typeof DOCKER_MYSQL_PROCESS_ID | typeof DOCKER_REDIS_PROCESS_ID | typeof DOCKER_QDRANT_PROCESS_ID {
  return (
    processId === DOCKER_POSTGRES_PROCESS_ID
    || processId === DOCKER_MYSQL_PROCESS_ID
    || processId === DOCKER_REDIS_PROCESS_ID
    || processId === DOCKER_QDRANT_PROCESS_ID
  );
}

export async function runDockerProcessAction(processId: string, action: ProcessAction): Promise<DockerCommandResult> {
  const config = findProcessConfigById(processId);

  if (!config) {
    return {
      accepted: false,
      message: `Unknown Docker process id: ${processId}`
    };
  }

  const runtimeState = await readDockerRuntimeState();

  if (!runtimeState.available) {
    return {
      accepted: false,
      message: COLIMA_NOT_STARTED_MESSAGE
    };
  }

  const container = findContainerForConfig(runtimeState.containers, config);

  if (!container) {
    const portsLabel = config.ports.join(',');

    return {
      accepted: false,
      message: `No Docker container found exposing ports ${portsLabel}.`
    };
  }

  if (action === 'start' && container.running) {
    return {
      accepted: false,
      message: `${config.name} container is already running.`
    };
  }

  if (action === 'stop' && !container.running) {
    return {
      accepted: false,
      message: `${config.name} container is already stopped.`
    };
  }

  try {
    const commandResult = await runDockerCommand([action, container.id]);
    const successVerb = action === 'start' ? 'started' : 'stopped';

    return {
      accepted: true,
      message: `${config.name} container ${successVerb} successfully.`,
      command: commandResult.command,
      output: commandResult.output
    };
  } catch (error) {
    const details = errorOutput(error);

    return {
      accepted: false,
      message: details || `Failed to ${action} Docker container for ${config.name}.`,
      output: details || undefined
    };
  }
}
