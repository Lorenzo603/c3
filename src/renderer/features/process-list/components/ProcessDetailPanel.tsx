import type { ProcessSummary } from '../../../../shared/process';

export interface ProcessDetailPanelProps {
  process?: ProcessSummary;
  fetchedAtIso?: string;
}

export function ProcessDetailPanel({ process, fetchedAtIso }: ProcessDetailPanelProps) {
  if (!process) {
    return (
      <section className="detail-panel">
        <h2>Process detail</h2>
        <p>Select a process row to inspect runtime metadata and control readiness.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel">
      <h2>{process.name}</h2>
      <dl>
        <dt>Source</dt>
        <dd>{process.source}</dd>

        <dt>Status</dt>
        <dd>{process.status}</dd>

        <dt>Health</dt>
        <dd>{process.health}</dd>

        <dt>PID</dt>
        <dd>{process.pid ?? 'n/a'}</dd>

        <dt>Ports</dt>
        <dd>{process.ports.length > 0 ? process.ports.join(', ') : 'n/a'}</dd>

        <dt>Last update</dt>
        <dd>{new Date(process.lastUpdatedIso).toLocaleString()}</dd>

        <dt>Collection fetched</dt>
        <dd>{fetchedAtIso ? new Date(fetchedAtIso).toLocaleString() : 'n/a'}</dd>
      </dl>

      <p className="detail-note">
        Start/stop/restart actions are intentionally stubbed. The UI already reflects typed control capability fields.
      </p>
    </section>
  );
}
