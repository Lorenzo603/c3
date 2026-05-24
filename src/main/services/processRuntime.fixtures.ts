import type {
  ProcessListQuery,
  ProcessSummary
} from '../../shared/process';

export function buildProcessFixtures(platformLabel: string): ProcessSummary[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'api-gateway',
      name: 'API Gateway',
      source: 'native',
      status: 'running',
      health: 'healthy',
      pid: 1324,
      ports: [8080],
      description: `Primary edge API (${platformLabel})`,
      uptimeSeconds: 16300,
      lastUpdatedIso: now,
      actions: {
        start: { supported: true, enabled: false, reason: 'Already running' },
        stop: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' },
        restart: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' }
      }
    },
    {
      id: 'worker-sync',
      name: 'Sync Worker',
      source: 'custom',
      status: 'degraded',
      health: 'warning',
      pid: 4921,
      ports: [],
      description: 'Background synchronization worker',
      uptimeSeconds: 1240,
      lastUpdatedIso: now,
      actions: {
        start: { supported: true, enabled: false, reason: 'Already running' },
        stop: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' },
        restart: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' }
      }
    },
    {
      id: 'docker-redis',
      name: 'Redis Cache',
      source: 'docker',
      status: 'running',
      health: 'healthy',
      pid: undefined,
      ports: [6379],
      description: 'Containerized cache service',
      uptimeSeconds: 8821,
      lastUpdatedIso: now,
      actions: {
        start: { supported: true, enabled: false, reason: 'Already running' },
        stop: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' },
        restart: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' }
      }
    },
    {
      id: 'postgres',
      name: 'Postgres DB',
      source: 'database',
      status: 'stopped',
      health: 'critical',
      pid: undefined,
      ports: [5432],
      description: 'Development database instance',
      uptimeSeconds: undefined,
      lastUpdatedIso: now,
      actions: {
        start: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' },
        stop: { supported: true, enabled: false, reason: 'Already stopped' },
        restart: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' }
      }
    },
    {
      id: 'scheduler',
      name: 'Job Scheduler',
      source: 'native',
      status: 'starting',
      health: 'unknown',
      pid: 2299,
      ports: [9010],
      description: 'Schedules recurring tasks',
      uptimeSeconds: 20,
      lastUpdatedIso: now,
      actions: {
        start: { supported: true, enabled: false, reason: 'Currently starting' },
        stop: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' },
        restart: { supported: true, enabled: false, reason: 'Control disabled in UI foundation milestone' }
      }
    }
  ];
}

export function filterProcesses(
  items: ProcessSummary[],
  query?: ProcessListQuery
): ProcessSummary[] {
  if (!query) {
    return items;
  }

  const searchValue = query.search?.trim().toLowerCase();

  return items.filter((item) => {
    const matchesSearch =
      !searchValue ||
      item.name.toLowerCase().includes(searchValue) ||
      (item.description?.toLowerCase().includes(searchValue) ?? false);

    const matchesSource = !query.source || query.source === 'all' || item.source === query.source;
    const matchesStatus = !query.status || query.status === 'all' || item.status === query.status;

    return matchesSearch && matchesSource && matchesStatus;
  });
}
