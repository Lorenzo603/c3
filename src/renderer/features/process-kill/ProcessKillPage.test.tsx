import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProcessKillPage } from './ProcessKillPage';
import type { ProcessKillGateway } from './services/processKillGateway';

function createGateway(overrides: Partial<ProcessKillGateway> = {}): ProcessKillGateway {
  return {
    findProcessByPort: async (request) => ({
      port: request.port,
      found: false,
      message: `No listening process was found on port ${request.port}.`
    }),
    killProcess: async (request) => ({
      pid: request.pid,
      accepted: false,
      message: 'stubbed'
    }),
    ...overrides
  };
}

describe('ProcessKillPage', () => {
  it('validates port input before searching', async () => {
    const gateway = createGateway();

    render(<ProcessKillPage gateway={gateway} />);

    fireEvent.change(screen.getByLabelText('Port Number'), {
      target: { value: '70000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid port between 1 and 65535.')).toBeInTheDocument();
    });
  });

  it('shows process details when a process is found', async () => {
    const gateway = createGateway({
      findProcessByPort: async (request) => ({
        port: request.port,
        found: true,
        message: 'Found process node (PID 999) on port 3000.',
        process: {
          pid: 999,
          name: 'node',
          user: 'furrerl',
          address: '*:3000',
          command: 'node server.js'
        }
      })
    });

    render(<ProcessKillPage gateway={gateway} />);

    fireEvent.change(screen.getByLabelText('Port Number'), {
      target: { value: '3000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Process Details' })).toBeInTheDocument();
    });

    expect(screen.getByText('node')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();
    expect(screen.getByText('node server.js')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kill PID 999' })).toBeInTheDocument();
  });

  it('kills the selected process and shows kill feedback', async () => {
    const findSpy = vi
      .fn<ProcessKillGateway['findProcessByPort']>()
      .mockResolvedValueOnce({
        port: 4000,
        found: true,
        message: 'Found process python (PID 321) on port 4000.',
        process: {
          pid: 321,
          name: 'python',
          user: 'furrerl',
          address: '*:4000',
          command: 'python -m http.server'
        }
      })
      .mockResolvedValueOnce({
        port: 4000,
        found: false,
        message: 'No listening process was found on port 4000.'
      });

    const killSpy = vi.fn<ProcessKillGateway['killProcess']>().mockResolvedValue({
      pid: 321,
      accepted: true,
      message: 'Termination signal sent to PID 321.'
    });

    const gateway = createGateway({
      findProcessByPort: findSpy,
      killProcess: killSpy
    });

    render(<ProcessKillPage gateway={gateway} />);

    fireEvent.change(screen.getByLabelText('Port Number'), {
      target: { value: '4000' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Kill PID 321' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Kill PID 321' }));

    await waitFor(() => {
      expect(killSpy).toHaveBeenCalledWith({ pid: 321 });
    });

    await waitFor(() => {
      expect(screen.getByText('Termination signal sent to PID 321.')).toBeInTheDocument();
    });
  });
});
