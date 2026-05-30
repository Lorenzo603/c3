import type {
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse,
  ProcessSummary
} from '../../shared/process';
import type { ProcessRuntime } from './processRuntime';
import {
  buildMonitoredColimaProcess,
  COLIMA_PROCESS_ID,
  runColimaAction
} from './processRuntime.colima';
import {
  buildMonitoredDockerProcesses,
  isDockerProcessId,
  runDockerProcessAction
} from './processRuntime.docker';
import { filterProcesses } from './processRuntime.fixtures';
import {
  buildMonitoredMongoProcess,
  buildMonitoredMySqlProcess
} from './processRuntime.database';
import {
  buildMonitoredCloudSqlProxyConnectionsProcess,
  CLOUD_SQL_PROXY_PROCESS_ID,
  runCloudSqlProxyConnectionsAction
} from './processRuntime.script';

function buildReadOnlyMessage(): string {
  return 'Process control is disabled in real monitoring mode for this milestone.';
}

async function buildRealProcessList(platform: NodeJS.Platform): Promise<ProcessSummary[]> {
  const [mongoProcess, mySqlProcess, dockerDatabaseProcesses, cloudSqlProxyScriptProcess] = await Promise.all([
    buildMonitoredMongoProcess(platform),
    buildMonitoredMySqlProcess(platform),
    buildMonitoredDockerProcesses(),
    buildMonitoredCloudSqlProxyConnectionsProcess(platform)
  ]);

  const baseProcesses = [cloudSqlProxyScriptProcess, mongoProcess, mySqlProcess, ...dockerDatabaseProcesses];

  if (platform !== 'darwin') {
    return baseProcesses;
  }

  const colimaProcess = await buildMonitoredColimaProcess(platform);

  return [colimaProcess, ...baseProcesses];
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
      if (request.processId === COLIMA_PROCESS_ID) {
        const colimaResult = await runColimaAction(request.action, platform);

        return {
          processId: request.processId,
          action: request.action,
          accepted: colimaResult.accepted,
          message: colimaResult.message,
          command: colimaResult.command,
          output: colimaResult.output
        };
      }

      if (request.processId === CLOUD_SQL_PROXY_PROCESS_ID) {
        const scriptResult = await runCloudSqlProxyConnectionsAction(request.action, platform);

        return {
          processId: request.processId,
          action: request.action,
          accepted: scriptResult.accepted,
          message: scriptResult.message,
          command: scriptResult.command,
          output: scriptResult.output
        };
      }

      if (isDockerProcessId(request.processId)) {
        const dockerResult = await runDockerProcessAction(request.processId, request.action);

        return {
          processId: request.processId,
          action: request.action,
          accepted: dockerResult.accepted,
          message: dockerResult.message,
          command: dockerResult.command,
          output: dockerResult.output
        };
      }

      return {
        processId: request.processId,
        action: request.action,
        accepted: false,
        message: buildReadOnlyMessage()
      };
    }
  };
}
