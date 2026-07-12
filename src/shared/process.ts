export const IPC_CHANNELS = {
  getProcessList: 'c3:get-process-list',
  processCommand: 'c3:process-command',
  findProcessByPort: 'c3:find-process-by-port',
  killProcess: 'c3:kill-process',
  launchShortcut: 'c3:launch-shortcut'
} as const;

export type ShortcutId = 'open-bruno-crmapps';

export type ProcessStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'degraded'
  | 'unknown';

export type ProcessSource = 'native' | 'docker' | 'database' | 'custom' | 'scripts';

export type ProcessHealth = 'healthy' | 'warning' | 'critical' | 'unknown';

export type ProcessAction = 'start' | 'stop';

export interface ActionCapability {
  supported: boolean;
  enabled: boolean;
  reason?: string;
}

export interface ProcessActionCapabilities {
  start: ActionCapability;
  stop: ActionCapability;
}

export interface ProcessSummary {
  id: string;
  name: string;
  logoPath: string;
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

export interface FindProcessByPortRequest {
  port: number;
}

export interface PortProcessDetails {
  pid: number;
  name: string;
  command: string;
  user?: string;
  address?: string;
}

export interface FindProcessByPortResponse {
  port: number;
  found: boolean;
  message: string;
  process?: PortProcessDetails;
  command?: string;
  output?: string;
}

export interface KillProcessRequest {
  pid: number;
}

export interface KillProcessResponse {
  pid: number;
  accepted: boolean;
  message: string;
  command?: string;
}

export interface LaunchShortcutRequest {
  shortcutId: ShortcutId;
}

export interface LaunchShortcutResponse {
  shortcutId: ShortcutId;
  accepted: boolean;
  message: string;
  command?: string;
  output?: string;
}

export interface C3DesktopApi {
  getProcessList(request?: GetProcessListRequest): Promise<GetProcessListResponse>;
  sendProcessCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse>;
  findProcessByPort(request: FindProcessByPortRequest): Promise<FindProcessByPortResponse>;
  killProcess(request: KillProcessRequest): Promise<KillProcessResponse>;
  launchShortcut(request: LaunchShortcutRequest): Promise<LaunchShortcutResponse>;
}
