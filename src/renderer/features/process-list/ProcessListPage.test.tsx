import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  GetProcessListResponse,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../../shared/process';
import { processFixtures } from './mocks/processFixtures';
import { ProcessListPage } from './ProcessListPage';
import type { ProcessGateway } from './services/processGateway';

function createGateway(
  responseFactory: () => Promise<GetProcessListResponse>
): ProcessGateway {
  return {
    getProcessList: responseFactory,
    sendProcessCommand: async (
      request: ProcessCommandRequest
    ): Promise<ProcessCommandResponse> => ({
      processId: request.processId,
      action: request.action,
      accepted: false,
      message: 'stubbed'
    })
  };
}

describe('ProcessListPage', () => {
  it('renders loading state while data is pending', () => {
    const gateway = createGateway(() => new Promise<GetProcessListResponse>(() => {}));

    render(<ProcessListPage gateway={gateway} />);

    expect(screen.getByText('Loading process snapshot...')).toBeInTheDocument();
  });

  it('renders process rows and allows row selection', async () => {
    const gateway = createGateway(async () => ({
      items: processFixtures,
      fetchedAtIso: new Date().toISOString()
    }));

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sync Worker'));

    expect(screen.getByRole('heading', { name: 'Sync Worker' })).toBeInTheDocument();
  });

  it('renders empty state when no processes are returned', async () => {
    const gateway = createGateway(async () => ({
      items: [],
      fetchedAtIso: new Date().toISOString()
    }));

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByText('No processes match the current filter set.')).toBeInTheDocument();
    });
  });

  it('renders error state when loading fails', async () => {
    const gateway = createGateway(async () => {
      throw new Error('gateway unavailable');
    });

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('gateway unavailable');
    });
  });

  it('retries after an error', async () => {
    const spy = vi
      .fn<() => Promise<GetProcessListResponse>>()
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValue({
        items: processFixtures,
        fetchedAtIso: new Date().toISOString()
      });

    const gateway = createGateway(spy);

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('transient failure');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });
  });

  it('refreshes process status when Refresh is clicked', async () => {
    const spy = vi.fn<() => Promise<GetProcessListResponse>>().mockResolvedValue({
      items: processFixtures,
      fetchedAtIso: new Date().toISOString()
    });

    const gateway = createGateway(spy);

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
    });

    expect(spy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});
