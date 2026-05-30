import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.fn();

interface DockerPsEntry {
  ID: string;
  Names: string;
  Image: string;
  Ports: string;
  Status?: string;
}

interface DockerExecResult {
  error?: Error;
  stdout?: string;
  stderr?: string;
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

function mockDockerExec(handler: (dockerArgs: string[]) => DockerExecResult) {
  execFileMock.mockImplementation((...args: unknown[]) => {
    const callback = args.at(-1);
    const command = args[0];
    const dockerArgs = args[1];

    if (typeof callback !== 'function') {
      throw new Error('docker mock was called without callback');
    }

    if (command !== 'docker' || !Array.isArray(dockerArgs)) {
      callback(new Error('unexpected docker command invocation'), '', '');
      return;
    }

    const result = handler(dockerArgs as string[]);

    if (result.error) {
      callback(result.error, result.stdout ?? '', result.stderr ?? '');
      return;
    }

    callback(null, result.stdout ?? '', result.stderr ?? '');
  });
}

function mockDockerPs(entries: DockerPsEntry[]) {
  mockDockerExec((dockerArgs) => {
    if (dockerArgs[0] !== 'ps' || !dockerArgs.includes('-a')) {
      return {
        error: new Error('unexpected docker command')
      };
    }

    return {
      stdout: entries.map((entry) => JSON.stringify(entry)).join('\n'),
      stderr: ''
    };
  });
}

function mockDockerUnavailable() {
  mockDockerExec(() => ({
    error: new Error('docker unavailable'),
    stdout: '',
    stderr: 'Cannot connect to Docker'
  }));
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

  it('detects PostgreSQL running and enables stop', async () => {
    mockDockerPs([
      {
        ID: 'abc123',
        Names: 'postgres-db',
        Image: 'postgres:16',
        Ports: '0.0.0.0:5432->5432/tcp',
        Status: 'Up 5 minutes'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const postgres = findProcessById(items, 'docker-postgres');

    expect(postgres).toMatchObject({
      status: 'running',
      health: 'healthy',
      ports: [5432]
    });
    expect(postgres.actions.start.enabled).toBe(false);
    expect(postgres.actions.stop.enabled).toBe(true);
    expect(postgres.description).toContain('postgres-db');
  });

  it('enables start when a monitored Docker container exists but is stopped', async () => {
    mockDockerPs([
      {
        ID: 'ghi789',
        Names: 'postgres-db',
        Image: 'postgres:16',
        Ports: '0.0.0.0:5432->5432/tcp',
        Status: 'Exited (0) 1 minute ago'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const postgres = findProcessById(items, 'docker-postgres');

    expect(postgres.status).toBe('stopped');
    expect(postgres.health).toBe('warning');
    expect(postgres.actions.start.enabled).toBe(true);
    expect(postgres.actions.stop.enabled).toBe(false);
  });

  it('detects Redis running and enables stop', async () => {
    mockDockerPs([
      {
        ID: 'def456',
        Names: 'redis-cache',
        Image: 'redis:7',
        Ports: '0.0.0.0:6379->6379/tcp',
        Status: 'Up 2 minutes'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const redis = findProcessById(items, 'docker-redis');

    expect(redis).toMatchObject({
      status: 'running',
      health: 'healthy',
      ports: [6379]
    });
    expect(redis.actions.start.enabled).toBe(false);
    expect(redis.actions.stop.enabled).toBe(true);
    expect(redis.description).toContain('redis-cache');
  });

  it('falls back to image/name matching when ports text is unavailable', async () => {
    mockDockerPs([
      {
        ID: 'rd002',
        Names: 'redis-cache',
        Image: 'redis:7',
        Ports: '',
        Status: 'Exited (0) 1 minute ago'
      }
    ]);

    const { buildMonitoredDockerProcesses } = await importDockerRuntime();

    const items = await buildMonitoredDockerProcesses();
    const redis = findProcessById(items, 'docker-redis');

    expect(redis.status).toBe('stopped');
    expect(redis.health).toBe('warning');
    expect(redis.actions.start.enabled).toBe(true);
    expect(redis.actions.stop.enabled).toBe(false);
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

  it('starts a stopped PostgreSQL container', async () => {
    mockDockerExec((dockerArgs) => {
      if (dockerArgs[0] === 'ps' && dockerArgs.includes('-a')) {
        return {
          stdout: JSON.stringify({
            ID: 'pg001',
            Names: 'postgres-db',
            Image: 'postgres:16',
            Ports: '0.0.0.0:5432->5432/tcp',
            Status: 'Exited (0) 3 minutes ago'
          }),
          stderr: ''
        };
      }

      if (dockerArgs[0] === 'start' && dockerArgs[1] === 'pg001') {
        return {
          stdout: 'pg001',
          stderr: ''
        };
      }

      return {
        error: new Error(`unexpected docker args: ${dockerArgs.join(' ')}`)
      };
    });

    const { runDockerProcessAction } = await importDockerRuntime();
    const result = await runDockerProcessAction('docker-postgres', 'start');

    expect(result.accepted).toBe(true);
    expect(result.command).toBe('docker start pg001');
    expect(result.message).toMatch(/started successfully/i);
    expect(result.output).toContain('pg001');
  });

  it('stops a running Redis container', async () => {
    mockDockerExec((dockerArgs) => {
      if (dockerArgs[0] === 'ps' && dockerArgs.includes('-a')) {
        return {
          stdout: JSON.stringify({
            ID: 'rd001',
            Names: 'redis-cache',
            Image: 'redis:7',
            Ports: '0.0.0.0:6379->6379/tcp',
            Status: 'Up 4 minutes'
          }),
          stderr: ''
        };
      }

      if (dockerArgs[0] === 'stop' && dockerArgs[1] === 'rd001') {
        return {
          stdout: 'rd001',
          stderr: ''
        };
      }

      return {
        error: new Error(`unexpected docker args: ${dockerArgs.join(' ')}`)
      };
    });

    const { runDockerProcessAction } = await importDockerRuntime();
    const result = await runDockerProcessAction('docker-redis', 'stop');

    expect(result.accepted).toBe(true);
    expect(result.command).toBe('docker stop rd001');
    expect(result.message).toMatch(/stopped successfully/i);
    expect(result.output).toContain('rd001');
  });
});
