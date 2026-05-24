import type {
  C3DesktopApi,
  GetProcessListRequest,
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse,
  ProcessListQuery,
  ProcessSummary
} from '../../../../shared/process';
import { processFixtures } from '../mocks/processFixtures';

export interface ProcessGateway {
  getProcessList(request?: GetProcessListRequest): Promise<GetProcessListResponse>;
  sendProcessCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse>;
}

export interface ProcessGatewayOptions {
  allowFixtureFallback?: boolean;
}

export const REQUIRED_DESKTOP_API_METHODS = ['getProcessList', 'sendProcessCommand'] as const;

export function isDesktopApi(candidate: unknown): candidate is C3DesktopApi {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const maybeApi = candidate as Record<string, unknown>;

  return REQUIRED_DESKTOP_API_METHODS.every(
    (methodName) => typeof maybeApi[methodName] === 'function'
  );
}

function filterFixtures(items: ProcessSummary[], query?: ProcessListQuery): ProcessSummary[] {
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

function createFixtureGateway(): ProcessGateway {
  return {
    async getProcessList(request: GetProcessListRequest = {}): Promise<GetProcessListResponse> {
      return {
        items: filterFixtures(processFixtures, request.query),
        fetchedAtIso: new Date().toISOString()
      };
    },
    async sendProcessCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse> {
      return {
        processId: request.processId,
        action: request.action,
        accepted: false,
        message: 'Fixture gateway: process control is not enabled yet.'
      };
    }
  };
}

export function createProcessGateway(api: unknown = window.c3Desktop): ProcessGateway {
  return createProcessGatewayWithOptions(api, {});
}

export function createProcessGatewayWithOptions(
  api: unknown = window.c3Desktop,
  options: ProcessGatewayOptions = {}
): ProcessGateway {
  const allowFixtureFallback = options.allowFixtureFallback ?? true;

  if (isDesktopApi(api)) {
    return {
      getProcessList: (request?: GetProcessListRequest) => api.getProcessList(request),
      sendProcessCommand: (request: ProcessCommandRequest) => api.sendProcessCommand(request)
    };
  }

  if (!allowFixtureFallback) {
    return {
      async getProcessList(): Promise<GetProcessListResponse> {
        throw new Error('Desktop API is unavailable in real mode.');
      },
      async sendProcessCommand(request: ProcessCommandRequest): Promise<ProcessCommandResponse> {
        return {
          processId: request.processId,
          action: request.action,
          accepted: false,
          message: 'Desktop API is unavailable in real mode.'
        };
      }
    };
  }

  return createFixtureGateway();
}
