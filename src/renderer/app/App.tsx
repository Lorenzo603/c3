import { ProcessListPage } from '../features/process-list/ProcessListPage';

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>C3 - Command and Control Cockpit</h1>
          <p>Process monitoring foundation: renderer shell, typed IPC, and feature modules.</p>
        </div>
      </header>

      <main className="app-main">
        <ProcessListPage />
      </main>
    </div>
  );
}
