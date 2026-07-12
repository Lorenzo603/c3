import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutsPage } from './ShortcutsPage';
import type { ShortcutsGateway } from './services/shortcutsGateway';

function createGateway(overrides: Partial<ShortcutsGateway> = {}): ShortcutsGateway {
  return {
    launchShortcut: async (request) => ({
      shortcutId: request.shortcutId,
      accepted: true,
      message: 'Shortcut launched in iTerm2.'
    }),
    ...overrides
  };
}

describe('ShortcutsPage', () => {
  it('launches Bruno CRM Apps shortcut and shows feedback', async () => {
    const launchShortcutSpy = vi
      .fn<ShortcutsGateway['launchShortcut']>()
      .mockResolvedValue({
        shortcutId: 'open-bruno-crmapps',
        accepted: true,
        message: 'Shortcut launched in iTerm2.'
      });

    const gateway = createGateway({ launchShortcut: launchShortcutSpy });

    render(<ShortcutsPage gateway={gateway} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Bruno CRM Apps in iTerm2' }));

    await waitFor(() => {
      expect(launchShortcutSpy).toHaveBeenCalledWith({
        shortcutId: 'open-bruno-crmapps'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Shortcut launched in iTerm2.')).toBeInTheDocument();
    });
  });
});
