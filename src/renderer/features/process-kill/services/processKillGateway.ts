import type {
  C3DesktopApi,
  FindProcessByPortRequest,
  FindProcessByPortResponse,
  KillProcessRequest,
  KillProcessResponse
} from '../../../../shared/process';

export interface ProcessKillGateway {
  findProcessByPort(request: FindProcessByPortRequest): Promise<FindProcessByPortResponse>;
  killProcess(request: KillProcessRequest): Promise<KillProcessResponse>;
}

const REQUIRED_DESKTOP_API_METHODS = ['findProcessByPort', 'killProcess'] as const;

function isDesktopApi(candidate: unknown): candidate is C3DesktopApi {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const maybeApi = candidate as Record<string, unknown>;

  return REQUIRED_DESKTOP_API_METHODS.every(
    (methodName) => typeof maybeApi[methodName] === 'function'
  );
}

export function createProcessKillGateway(api: unknown = window.c3Desktop): ProcessKillGateway {
  if (isDesktopApi(api)) {
    return {
      findProcessByPort: (request: FindProcessByPortRequest) => api.findProcessByPort(request),
      killProcess: (request: KillProcessRequest) => api.killProcess(request)
    };
  }

  return {
    async findProcessByPort(request: FindProcessByPortRequest): Promise<FindProcessByPortResponse> {
      return {
        port: request.port,
        found: false,
        message: 'Desktop API is unavailable in this environment.'
      };
    },
    async killProcess(request: KillProcessRequest): Promise<KillProcessResponse> {
      return {
        pid: request.pid,
        accepted: false,
        message: 'Desktop API is unavailable in this environment.'
      };
    }
  };
}
