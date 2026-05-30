import { useState } from 'react';
import { ProcessListPage } from '../features/process-list/ProcessListPage';
import { ProcessKillPage } from '../features/process-kill/ProcessKillPage';

type AppPageId = 'process-monitoring' | 'process-kill';

interface AppPage {
  id: AppPageId;
  label: string;
  description: string;
}

const APP_PAGE_ORDER: AppPageId[] = ['process-monitoring', 'process-kill'];

const APP_PAGES: Record<AppPageId, AppPage> = {
  'process-monitoring': {
    id: 'process-monitoring',
    label: 'Process Monitoring',
    description: 'Process monitoring foundation: renderer shell, typed IPC, and feature modules.'
  },
  'process-kill': {
    id: 'process-kill',
    label: 'Process Kill',
    description: 'Dedicated workflow area for kill actions.'
  }
};

export function App() {
  const [activePageId, setActivePageId] = useState<AppPageId>('process-monitoring');
  const activePage = APP_PAGES[activePageId];

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Application navigation">
        <div className="app-brand">
          <h2>C3</h2>
          <p>Command and Control Cockpit</p>
        </div>

        <nav className="app-sidebar-nav" aria-label="Feature pages">
          {APP_PAGE_ORDER.map((pageId) => {
            const page = APP_PAGES[pageId];
            const isActive = page.id === activePage.id;

            return (
              <button
                key={page.id}
                type="button"
                className={`app-sidebar-link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActivePageId(page.id);
                }}
              >
                {page.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div>
            <h1>{activePage.label}</h1>
            <p>{activePage.description}</p>
          </div>
        </header>

        <main className="app-main">
          {activePage.id === 'process-monitoring' ? (
            <ProcessListPage />
          ) : (
            <ProcessKillPage />
          )}
        </main>
      </div>
    </div>
  );
}
