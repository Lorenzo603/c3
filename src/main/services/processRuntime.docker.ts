import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessSummary } from '../../shared/process';

const execFileAsync = promisify(execFile);

const POSTGRES_DOCKER_PORT = 5432;
const REDIS_DOCKER_PORT = 6379;
const COLIMA_NOT_STARTED_MESSAGE = 'Colima not started';
const READ_ONLY_REASON = 'Container monitoring is read-only in this milestone.';

interface DockerContainerSummary {
  id: string;
  name: string;
  image: string;
  ports: string;
}

interface DockerRuntimeState {
  available: boolean;
  containers: DockerContainerSummary[];
}

function monitoredActionCapability() {
  return {
    supported: false,
    enabled: false,
    reason: READ_ONLY_REASON
  };
}

async function readDockerRuntimeState(): Promise<DockerRuntimeState> {
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{json .}}']);

    const containers = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Partial<DockerContainerSummary> & { ID?: string; Names?: string; Image?: string; Ports?: string })
      .map((entry) => ({
        id: entry.ID ?? '',
        name: entry.Names ?? '',
        image: entry.Image ?? '',
        ports: entry.Ports ?? ''
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
  return containers.find((container) => container.ports.includes(targetToken));
}

function buildDockerProcessSummary(
  runtimeState: DockerRuntimeState,
  config: {
    id: string;
    name: string;
    port: number;
  }
): ProcessSummary {
  if (!runtimeState.available) {
    return {
      id: config.id,
      name: config.name,
      source: 'docker',
      status: 'stopped',
      health: 'warning',
      ports: [config.port],
      description: COLIMA_NOT_STARTED_MESSAGE,
      lastUpdatedIso: new Date().toISOString(),
      actions: {
        start: monitoredActionCapability(),
        stop: monitoredActionCapability(),
        restart: monitoredActionCapability()
      }
    };
  }

  const container = findContainerByPort(runtimeState.containers, config.port);

  return {
    id: config.id,
    name: config.name,
    source: 'docker',
    status: container ? 'running' : 'stopped',
    health: container ? 'healthy' : 'critical',
    ports: [config.port],
    description: container
      ? `Running in Docker container ${container.name} (${container.image}) on port ${config.port}`
      : `Watching Docker containers on port ${config.port}`,
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: monitoredActionCapability(),
      stop: monitoredActionCapability(),
      restart: monitoredActionCapability()
    }
  };
}

export async function buildMonitoredDockerDatabaseProcesses(): Promise<ProcessSummary[]> {
  const runtimeState = await readDockerRuntimeState();

  const postgres = buildDockerProcessSummary(runtimeState, {
    id: 'docker-postgres',
    name: 'PostgreSQL (Docker)',
    port: POSTGRES_DOCKER_PORT
  });

  const redis = buildDockerProcessSummary(runtimeState, {
    id: 'docker-redis',
    name: 'Redis (Docker)',
    port: REDIS_DOCKER_PORT
  });

  return [postgres, redis];
}
