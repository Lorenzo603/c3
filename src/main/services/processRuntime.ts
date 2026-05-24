import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../shared/process';
import { createMacosProcessRuntime } from './processRuntime.macos';
import { createRealProcessRuntime } from './processRuntime.real';
import { createStubProcessRuntime } from './processRuntime.stub';
import { createWindowsProcessRuntime } from './processRuntime.windows';

export interface ProcessRuntime {
  getProcessList(request?: GetProcessListRequest): Promise<GetProcessListResponse>;
  sendCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse>;
}

export type ProcessRuntimeMode = 'real' | 'test';

export interface ProcessRuntimeOptions {
  platform?: NodeJS.Platform;
  mode?: ProcessRuntimeMode;
}

function isFixtureMode(mode: ProcessRuntimeMode): boolean {
  return mode === 'test';
}

export function createProcessRuntime(
  options: ProcessRuntimeOptions = {}
): ProcessRuntime {
  const platform = options.platform ?? process.platform;
  const mode = options.mode ?? 'real';
  const useFixtures = isFixtureMode(mode);

  if (platform === 'darwin') {
    return createMacosProcessRuntime(useFixtures);
  }

  if (platform === 'win32') {
    return createWindowsProcessRuntime(useFixtures);
  }

  if (useFixtures) {
    return createStubProcessRuntime(platform, platform);
  }

  return createRealProcessRuntime(platform);
}
