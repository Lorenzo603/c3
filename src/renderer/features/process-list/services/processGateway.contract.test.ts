import { describe, expect, it, vi } from 'vitest';
import type {
  C3DesktopApi,
  GetProcessListResponse,
  ProcessCommandResponse
} from '../../../../shared/process';
import {
  REQUIRED_DESKTOP_API_METHODS,
  createProcessGateway,
  createProcessGatewayWithOptions,
  isDesktopApi
} from './processGateway';

describe('process gateway contracts', () => {
  it('defines required desktop API methods', () => {
    expect(REQUIRED_DESKTOP_API_METHODS).toEqual(['getProcessList', 'sendProcessCommand']);
  });

  it('accepts objects that satisfy the desktop API shape', () => {
    const candidate = {
      getProcessList: async () => ({ items: [], fetchedAtIso: new Date().toISOString() }),
      sendProcessCommand: async () => ({
        processId: 'p',
        action: 'start',
        accepted: false,
        message: 'stub'
      })
    };

    expect(isDesktopApi(candidate)).toBe(true);
  });

  it('delegates calls to preload API when present', async () => {
    const processListResponse: GetProcessListResponse = {
      items: [],
      fetchedAtIso: new Date().toISOString()
    };

    const commandResponse: ProcessCommandResponse = {
      processId: 'p1',
      action: 'restart',
      accepted: false,
      message: 'not enabled'
    };

    const api: C3DesktopApi = {
      getProcessList: vi.fn().mockResolvedValue(processListResponse),
      sendProcessCommand: vi.fn().mockResolvedValue(commandResponse)
    };

    const gateway = createProcessGateway(api);

    await expect(gateway.getProcessList()).resolves.toEqual(processListResponse);
    await expect(
      gateway.sendProcessCommand({ processId: 'p1', action: 'restart' })
    ).resolves.toEqual(commandResponse);

    expect(api.getProcessList).toHaveBeenCalledTimes(1);
    expect(api.sendProcessCommand).toHaveBeenCalledWith({ processId: 'p1', action: 'restart' });
  });

  it('falls back to fixture gateway when preload API is unavailable', async () => {
    const gateway = createProcessGateway(undefined);
    const listResponse = await gateway.getProcessList();

    expect(Array.isArray(listResponse.items)).toBe(true);

    const commandResponse = await gateway.sendProcessCommand({
      processId: 'x',
      action: 'stop'
    });

    expect(commandResponse.accepted).toBe(false);
  });

  it('does not fall back to fixtures when fallback is disabled', async () => {
    const gateway = createProcessGatewayWithOptions(undefined, {
      allowFixtureFallback: false
    });

    await expect(gateway.getProcessList()).rejects.toThrow(/Desktop API is unavailable/i);

    await expect(
      gateway.sendProcessCommand({ processId: 'x', action: 'stop' })
    ).resolves.toMatchObject({
      accepted: false,
      message: expect.stringMatching(/Desktop API is unavailable/i)
    });
  });
});
