import { useMemo, useState } from 'react';
import type { ShortcutId } from '../../../shared/process';
import { createShortcutsGateway, type ShortcutsGateway } from './services/shortcutsGateway';

export interface ShortcutsPageProps {
  gateway?: ShortcutsGateway;
}

interface ShortcutDefinition {
  id: ShortcutId;
  label: string;
  launchingLabel: string;
  iconPath?: string;
}

const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'open-bruno-crmapps',
    label: 'Open Bruno CRM Apps in iTerm2',
    launchingLabel: 'Launching Bruno CRM Apps...',
    iconPath: '/process-logos/bruno.png'
  },
  {
    id: 'open-vscode-lxitcrm',
    label: 'Open VS Code: lxitcrm',
    launchingLabel: 'Opening VS Code: lxitcrm...'
  },
  {
    id: 'open-vscode-crmsapp',
    label: 'Open VS Code: crmsapp',
    launchingLabel: 'Opening VS Code: crmsapp...'
  },
  {
    id: 'open-vscode-one-cst',
    label: 'Open VS Code: one-cst',
    launchingLabel: 'Opening VS Code: one-cst...'
  }
];

export function ShortcutsPage({ gateway }: ShortcutsPageProps) {
  const [pendingShortcutId, setPendingShortcutId] = useState<ShortcutId | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const effectiveGateway = useMemo(
    () => gateway ?? createShortcutsGateway(window.c3Desktop),
    [gateway]
  );

  async function handleLaunchShortcut(shortcutId: ShortcutId) {
    setPendingShortcutId(shortcutId);
    setFeedbackMessage('');

    try {
      const result = await effectiveGateway.launchShortcut({
        shortcutId
      });
      setFeedbackMessage(result.message);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : 'Unable to launch shortcut.'
      );
    } finally {
      setPendingShortcutId(null);
    }
  }

  return (
    <section className="shortcuts-page" aria-label="Shortcuts page">
      <section className="shortcuts-surface" aria-label="Available shortcuts">
        <h2>Available Shortcuts</h2>
        <p className="shortcuts-subtitle">
          Use these actions to quickly open common workspaces.
        </p>

        <ul className="shortcuts-button-list" aria-label="Shortcut actions">
          {SHORTCUTS.map((shortcut) => {
            const isLaunching = pendingShortcutId === shortcut.id;

            return (
              <li key={shortcut.id}>
                <button
                  type="button"
                  className="shortcuts-action-button"
                  disabled={pendingShortcutId !== null}
                  onClick={() => {
                    void handleLaunchShortcut(shortcut.id);
                  }}
                >
                  {shortcut.iconPath ? (
                    <img
                      className="shortcuts-action-icon"
                      src={shortcut.iconPath}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{isLaunching ? shortcut.launchingLabel : shortcut.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {feedbackMessage ? <p className="shortcuts-message">{feedbackMessage}</p> : null}
      </section>
    </section>
  );
}
