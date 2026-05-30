import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.fn();

interface DockerPsEntry {
  ID: string;
  Names: string;
  Image: string;
  Ports: string;
}

function findProcessById(
  items: Awaited<ReturnType<(typeof import('./processRuntime.docker'))['buildMonitoredDockerProcesses']>>,
  id: string
) {
  const item = items.find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`Expected process with id ${id} to be present`);
  }

  return item;
}

function mockDockerPs(entries: DockerPsEntry[]) {
  execFileMock.mockImplementation(
    (...args: unknown[]) => {
      const callback = args.at(-1);

      if (typeof callback !== 'function') {
        throw new Error('docker ps mock was called without callback');
      }

      const stdout = entries.map((entry) => JSON.stringify(entry)).join('\n');
      callback(null, stdout, '');
    }
  );
}

function mockDockerUnavailable() {
  execFileMock.mockImplementation(
    (...args: unknown[]) => {
      const callback = args.at(-1);

      if (typeof callback !== 'function') {
        throw new Error('docker unavailable mock was called without callback');
      }

      callback(new Error('docker unavailable'), '', 'Cannot connect to Docker');
    }
  );
}

describe('docker process monitoring', () => {
  beforeEach(() => {
    vi.resetModules();
    execFileMock.mockReset();
  });

  async function importDockerRuntime() {
    const mockedExecFile = Object.assign(execFileMock, {
      [Symbol.for('nodejs.util.promisify.custom')]: (...args: unknown[]) =>
        new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          execFileMock(...args, (error: unknown, stdout: string, stderr: string) => {
            if (error) {
              const errorWithOutput = Object.assign(
                error instanceof Error ? error : new Error(String(error)),
                { stdout, stderr }
              );
              reject(errorWithOutput);
              return;
            }

            resolve({ stdout, stderr });
          });
        })
    });

    vi.doMock('node:child_process', () => ({
      execFile: mockedExecFile,
      default: {
        execFile: mockedExecFile
      }
    }));

    return import('./processRuntime.docker');
  }

  it('detects PostgreSQL container on host port 5432', async () => {
    mockDockerPs([
      {
        ID: 'abc123',
        Names: 'postgres-db',
        Image: 'postgres:16',
        Ports: '0.0.0.0:5432->5432/tcp'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const postgres = findProcessById(items, 'docker-postgres');
    const redis = findProcessById(items, 'docker-redis');

    expect(postgres).toMatchObject({
      id: 'docker-postgres',
      status: 'running',
      health: 'healthy',
      ports: [5432]
    });
    expect(postgres.description).toContain('postgres-db');

    expect(redis).toMatchObject({
      id: 'docker-redis',
      status: 'stopped',
      health: 'critical',
      ports: [6379]
    });
  });

  it('detects Redis container on host port 6379', async () => {
    mockDockerPs([
      {
        ID: 'def456',
        Names: 'redis-cache',
        Image: 'redis:7',
        Ports: '0.0.0.0:6379->6379/tcp'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const postgres = findProcessById(items, 'docker-postgres');
    const redis = findProcessById(items, 'docker-redis');

    expect(postgres.status).toBe('stopped');
    expect(redis).toMatchObject({
      id: 'docker-redis',
      status: 'running',
      health: 'healthy',
      ports: [6379]
    });
    expect(redis.description).toContain('redis-cache');
  });

  it('reports Colima not started when Docker runtime is unavailable', async () => {
    mockDockerUnavailable();

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const postgres = findProcessById(items, 'docker-postgres');
    const redis = findProcessById(items, 'docker-redis');

    expect(postgres.description).toBe('Colima not started');
    expect(redis.description).toBe('Colima not started');
    expect(postgres.actions.start.supported).toBe(false);
    expect(redis.actions.start.supported).toBe(false);
  });
});
