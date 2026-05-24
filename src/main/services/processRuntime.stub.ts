import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../shared/process';
import type { ProcessRuntime } from './processRuntime';
import { buildProcessFixtures, filterProcesses } from './processRuntime.fixtures';

export function createStubProcessRuntime(
  platformLabel: string,
  _platform: NodeJS.Platform = process.platform
): ProcessRuntime {
  const fixtures = buildProcessFixtures(platformLabel);

  return {
    async getProcessList(request: GetProcessListRequest = {}): Promise<GetProcessListResponse> {
      return {
        items: filterProcesses(fixtures, request.query),
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
