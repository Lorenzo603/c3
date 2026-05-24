import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../shared/process';
import { createMacosProcessRuntime } from './processRuntime.macos';
import { createStubProcessRuntime } from './processRuntime.stub';
import { createWindowsProcessRuntime } from './processRuntime.windows';

export interface ProcessRuntime {
  getProcessList(request?: GetProcessListRequest): Promise<GetProcessListResponse>;
  sendCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse>;
}

export function createProcessRuntime(platform: NodeJS.Platform = process.platform): ProcessRuntime {
  if (platform === 'darwin') {
    return createMacosProcessRuntime();
  }

  if (platform === 'win32') {
    return createWindowsProcessRuntime();
  }

  return createStubProcessRuntime(platform, platform);
}
