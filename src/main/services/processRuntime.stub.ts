import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../shared/process';
import type { ProcessRuntime } from './processRuntime';
import { buildProcessFixtures, filterProcesses } from './processRuntime.fixtures';
import { buildMonitoredMongoProcess } from './processRuntime.mongodb';

export function createStubProcessRuntime(
  platformLabel: string,
  platform: NodeJS.Platform = process.platform
): ProcessRuntime {
  const fixtures = buildProcessFixtures(platformLabel);

  return {
    async getProcessList(request: GetProcessListRequest = {}): Promise<GetProcessListResponse> {
      const mongoProcess = await buildMonitoredMongoProcess(platform);

      return {
        items: filterProcesses([...fixtures, mongoProcess], request.query),
        fetchedAtIso: new Date().toISOString()
      };
    },
    async sendCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse> {
      return {
        processId: request.processId,
        action: request.action,
        accepted: false,
        message: 'Process control is stubbed for this milestone.'
      };
    }
  };
}
