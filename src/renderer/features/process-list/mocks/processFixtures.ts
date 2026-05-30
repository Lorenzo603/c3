import type { ProcessSummary } from '../../../../shared/process';

const now = new Date().toISOString();

export const processFixtures: ProcessSummary[] = [
  {
    id: 'api-gateway',
    name: 'API Gateway',
    source: 'native',
    status: 'running',
    health: 'healthy',
    pid: 1324,
    ports: [8080],
    description: 'Primary edge API service',
    uptimeSeconds: 16300,
    lastUpdatedIso: now,
    actions: {
      start: { supported: true, enabled: false, reason: 'Already running' },
      stop: { supported: true, enabled: false, reason: 'Control disabled in this milestone' }
    }
  },
  {
    id: 'sync-worker',
    name: 'Sync Worker',
    source: 'custom',
    status: 'degraded',
    health: 'warning',
    pid: 4921,
    ports: [],
    description: 'Background sync and reconciliation worker',
    uptimeSeconds: 1240,
    lastUpdatedIso: now,
    actions: {
      start: { supported: true, enabled: false, reason: 'Already running' },
      stop: { supported: true, enabled: false, reason: 'Control disabled in this milestone' }
    }
  },
  {
    id: 'redis',
    name: 'Redis Cache',
    source: 'docker',
    status: 'running',
    health: 'healthy',
    pid: undefined,
    ports: [6379],
    description: 'Containerized cache node',
    uptimeSeconds: 8810,
    lastUpdatedIso: now,
    actions: {
      start: { supported: true, enabled: false, reason: 'Already running' },
      stop: { supported: true, enabled: false, reason: 'Control disabled in this milestone' }
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
    description: 'Development data store',
    uptimeSeconds: undefined,
    lastUpdatedIso: now,
    actions: {
      start: { supported: true, enabled: false, reason: 'Control disabled in this milestone' },
      stop: { supported: true, enabled: false, reason: 'Already stopped' }
    }
  },
  {
    id: 'mongodb-local',
    name: 'MongoDB Local',
    source: 'database',
    status: 'stopped',
    health: 'critical',
    ports: [27017],
    description: 'Targeted local MongoDB monitor on localhost:27017',
    uptimeSeconds: undefined,
    lastUpdatedIso: now,
    actions: {
      start: {
        supported: false,
        enabled: false,
        reason: 'MongoDB monitoring is read-only in this milestone'
      },
      stop: {
        supported: false,
        enabled: false,
        reason: 'MongoDB monitoring is read-only in this milestone'
      }
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
    description: 'Schedules recurring and delayed jobs',
    uptimeSeconds: 20,
    lastUpdatedIso: now,
    actions: {
      start: { supported: true, enabled: false, reason: 'Currently starting' },
      stop: { supported: true, enabled: false, reason: 'Control disabled in this milestone' }
    }
  }
];
