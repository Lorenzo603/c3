import type { ProcessAction } from '../../../../shared/process';

export interface ProcessCommandLogEntry {
  id: number;
  timestampIso: string;
  processName: string;
  action: ProcessAction;
  message: string;
  command?: string;
  output?: string;
  accepted?: boolean;
}

function formatTimestamp(timestampIso: string): string {
  return new Date(timestampIso).toLocaleTimeString();
}

export interface ProcessCommandLogBarProps {
  entries: ProcessCommandLogEntry[];
}

export function ProcessCommandLogBar({ entries }: ProcessCommandLogBarProps) {
  return (
    <section className="process-log-surface" aria-label="Process command log">
      <header className="process-log-header">
        <h3>Command Log</h3>
        <span>{entries.length} entries</span>
      </header>

      {entries.length === 0 && (
        <p className="process-log-empty">No command activity yet.</p>
      )}

      {entries.length > 0 && (
        <ul className="process-log-list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={entry.accepted === false ? 'process-log-item failed' : 'process-log-item'}
            >
              <div className="process-log-meta">
                <time>{formatTimestamp(entry.timestampIso)}</time>
                <strong>{entry.processName}</strong>
                <span>{entry.action.toUpperCase()}</span>
              </div>
              <p className="process-log-message">{entry.message}</p>
              {entry.command && <p className="process-log-command">$ {entry.command}</p>}
              {entry.output && <pre className="process-log-output">{entry.output}</pre>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
