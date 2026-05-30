import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  GetProcessListResponse,
  ProcessSummary,
  ProcessCommandRequest,
  ProcessCommandResponse
} from '../../../shared/process';
import { processFixtures } from './mocks/processFixtures';
import { ProcessListPage } from './ProcessListPage';
import type { ProcessGateway } from './services/processGateway';

function createGateway(
  responseFactory: () => Promise<GetProcessListResponse>,
  commandFactory?: (request: ProcessCommandRequest) => Promise<ProcessCommandResponse>
): ProcessGateway {
  return {
    getProcessList: responseFactory,
    sendProcessCommand: commandFactory ?? (async (
      request: ProcessCommandRequest
    ): Promise<ProcessCommandResponse> => ({
      processId: request.processId,
      action: request.action,
      accepted: false,
      message: 'stubbed'
    }))
  };
}

function buildControllableProcess(): ProcessSummary {
  return {
    id: 'colima-local',
    name: 'Colima',
    logoPath: '/process-logos/colima.svg',
    source: 'docker',
    status: 'stopped',
    health: 'warning',
    ports: [],
    description: 'Colima instance is stopped. Use Start to launch it.',
    lastUpdatedIso: new Date().toISOString(),
    actions: {
      start: {
        supported: true,
        enabled: true,
        reason: 'Start Colima'
      },
      stop: {
        supported: true,
        enabled: false,
        reason: 'Already stopped'
      }
    }
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

  it('shows Starting feedback and logs command output while action runs', async () => {
    const process = buildControllableProcess();
    const loadSpy = vi.fn<() => Promise<GetProcessListResponse>>().mockResolvedValue({
      items: [process],
      fetchedAtIso: new Date().toISOString()
    });

    let resolveCommand: ((value: ProcessCommandResponse) => void) | undefined;

    const gateway = createGateway(loadSpy, async (request) => {
      return await new Promise<ProcessCommandResponse>((resolve) => {
        resolveCommand = resolve;
      });
    });

    render(<ProcessListPage gateway={gateway} />);

    await waitFor(() => {
      expect(screen.getByText('Colima')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(screen.getByRole('button', { name: 'Starting...' })).toBeDisabled();
    expect(screen.getByLabelText('Process command log')).toHaveTextContent('Starting...');

    resolveCommand?.({
      processId: 'colima-local',
      action: 'start',
      accepted: true,
      message: 'Colima started successfully.',
      command: 'colima start',
      output: 'starting vm...'
    });

    await waitFor(() => {
      expect(screen.getByText('Colima started successfully.')).toBeInTheDocument();
    });

    expect(screen.getByText('$ colima start')).toBeInTheDocument();
    expect(screen.getByText('starting vm...')).toBeInTheDocument();
  });
});
