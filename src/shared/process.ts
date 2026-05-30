export const IPC_CHANNELS = {
  getProcessList: 'c3:get-process-list',
  processCommand: 'c3:process-command'
} as const;

export type ProcessStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'degraded'
  | 'unknown';

export type ProcessSource = 'native' | 'docker' | 'database' | 'custom';

export type ProcessHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

export type ProcessAction = 'start' | 'stop' | 'restart';

export interface ActionCapability {
  supported: boolean;
  enabled: boolean;
  reason?: string;
}

export interface ProcessActionCapabilities {
  start: ActionCapability;
  stop: ActionCapability;
  restart: ActionCapability;
}

export interface ProcessSummary {
  id: string;
  name: string;
  source: ProcessSource;
  status: ProcessStatus;
  health: ProcessHealth;
  pid?: number;
  ports: number[];
  description?: string;
  uptimeSeconds?: number;
  lastUpdatedIso: string;
  actions: ProcessActionCapabilities;
}

export interface ProcessListQuery {
  search?: string;
  source?: ProcessSource | 'all';
  status?: ProcessStatus | 'all';
}

export interface GetProcessListRequest {
  query?: ProcessListQuery;
}

export interface GetProcessListResponse {
  items: ProcessSummary[];
  fetchedAtIso: string;
}

export interface ProcessCommandRequest {
  processId: string;
  action: ProcessAction;
}

export interface ProcessCommandResponse {
  processId: string;
  action: ProcessAction;
  accepted: boolean;
  message: string;
  command?: string;
  output?: string;
}

export interface C3DesktopApi {
  getProcessList(request?: GetProcessListRequest): Promise<GetProcessListResponse>;
  sendProcessCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse>;
}
