import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse,
  ProcessSummary
} from '../../shared/process';
import type { ProcessRuntime } from './processRuntime';
import { filterProcesses } from './processRuntime.fixtures';
import { buildMonitoredMongoProcess } from './processRuntime.mongodb';

function buildReadOnlyMessage(): string {
  return 'Process control is disabled in real monitoring mode for this milestone.';
}

async function buildRealProcessList(platform: NodeJS.Platform): Promise<ProcessSummary[]> {
  const mongoProcess = await buildMonitoredMongoProcess(platform);
  return [mongoProcess];
}

export function createRealProcessRuntime(platform: NodeJS.Platform = process.platform): ProcessRuntime {
  return {
    async getProcessList(request: GetProcessListRequest = {}): Promise<GetProcessListResponse> {
      const liveProcesses = await buildRealProcessList(platform);

      return {
        items: filterProcesses(liveProcesses, request.query),
        fetchedAtIso: new Date().toISOString()
      };
    },
    async sendCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse> {
      return {
        processId: request.processId,
        action: request.action,
        accepted: false,
        message: buildReadOnlyMessage()
      };
    }
  };
}
