import { useMemo, useState } from 'react';
import { createShortcutsGateway, type ShortcutsGateway } from './services/shortcutsGateway';

export interface ShortcutsPageProps {
  gateway?: ShortcutsGateway;
}

export function ShortcutsPage({ gateway }: ShortcutsPageProps) {
  const [isLaunchingCrmApps, setIsLaunchingCrmApps] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const effectiveGateway = useMemo(
    () => gateway ?? createShortcutsGateway(window.c3Desktop),
    [gateway]
  );

  async function handleLaunchBrunoCrmAppsShortcut() {
    setIsLaunchingCrmApps(true);
    setFeedbackMessage('');

    try {
      const result = await effectiveGateway.launchShortcut({
        shortcutId: 'open-bruno-crmapps'
      });
      setFeedbackMessage(result.message);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : 'Unable to launch shortcut.'
      );
    } finally {
      setIsLaunchingCrmApps(false);
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
          <li>
            <button
              type="button"
              className="shortcuts-action-button"
              disabled={isLaunchingCrmApps}
              onClick={() => {
                void handleLaunchBrunoCrmAppsShortcut();
              }}
            >
              {isLaunchingCrmApps
                ? 'Launching Bruno CRM Apps...'
                : 'Open Bruno CRM Apps in iTerm2'}
            </button>
          </li>
        </ul>

        {feedbackMessage ? <p className="shortcuts-message">{feedbackMessage}</p> : null}
      </section>
    </section>
  );
}
