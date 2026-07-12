import type {
  C3DesktopApi,
  LaunchShortcutRequest,
  LaunchShortcutResponse
} from '../../../../shared/process';

export interface ShortcutsGateway {
  launchShortcut(request: LaunchShortcutRequest): Promise<LaunchShortcutResponse>;
}

const REQUIRED_DESKTOP_API_METHODS = ['launchShortcut'] as const;

function isDesktopApi(candidate: unknown): candidate is C3DesktopApi {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const maybeApi = candidate as Record<string, unknown>;

  return REQUIRED_DESKTOP_API_METHODS.every(
    (methodName) => typeof maybeApi[methodName] === 'function'
  );
}

export function createShortcutsGateway(api: unknown = window.c3Desktop): ShortcutsGateway {
  if (isDesktopApi(api)) {
    return {
      launchShortcut: (request: LaunchShortcutRequest) => api.launchShortcut(request)
    };
  }

  return {
    async launchShortcut(request: LaunchShortcutRequest): Promise<LaunchShortcutResponse> {
      return {
        shortcutId: request.shortcutId,
        accepted: false,
        message: 'Desktop API is unavailable in this environment.'
      };
    }
  };
}
