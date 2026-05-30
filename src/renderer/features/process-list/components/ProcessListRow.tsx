import { useState } from 'react';
import type { ProcessAction, ProcessSummary } from '../../../../shared/process';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';

export interface ProcessListRowProps {
  process: ProcessSummary;
  isSelected: boolean;
  pendingAction?: ProcessAction;
  onSelect: (processId: string) => void;
  onAction: (processId: string, action: ProcessAction) => void;
}

function ActionButton({
  label,
  disabled,
  title,
  onClick
}: {
  label: string;
  disabled: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="action-button" disabled={disabled} title={title} onClick={onClick}>
      {label}
    </button>
  );
}

function buildLogoFallback(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('');

  return initials.length > 0 ? initials : '?';
}

function ProcessLogo({ name, logoPath }: { name: string; logoPath: string }) {
  const [failed, setFailed] = useState(false);

  if (failed || logoPath.length === 0) {
    return <span className="process-logo-fallback">{buildLogoFallback(name)}</span>;
  }

  return (
    <img
      className="process-logo-image"
      src={logoPath}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function ProcessListRow({ process, isSelected, pendingAction, onSelect, onAction }: ProcessListRowProps) {
  const isBusy = Boolean(pendingAction);

  return (
    <tr
      className={isSelected ? 'process-row selected' : 'process-row'}
      onClick={() => onSelect(process.id)}
      aria-selected={isSelected}
    >
      <td>
        <div className="process-primary-cell">
          <div className="process-logo-tile" aria-hidden="true">
            <ProcessLogo name={process.name} logoPath={process.logoPath} />
          </div>
          <div className="process-name-cell">
            <strong>{process.name}</strong>
            <small>{process.description ?? 'No description'}</small>
          </div>
        </div>
      </td>
      <td>
        <SourceBadge source={process.source} />
      </td>
      <td>
        <StatusBadge status={process.status} />
      </td>
      <td>{process.health}</td>
      <td>{process.pid ?? 'n/a'}</td>
      <td>{process.ports.length > 0 ? process.ports.join(', ') : 'n/a'}</td>
      <td>
        <div className="row-actions" onClick={(event) => event.stopPropagation()}>
          <ActionButton
            label={pendingAction === 'start' ? 'Starting...' : 'Start'}
            disabled={isBusy || !process.actions.start.enabled}
            title={process.actions.start.reason}
            onClick={() => onAction(process.id, 'start')}
          />
          <ActionButton
            label={pendingAction === 'stop' ? 'Stopping...' : 'Stop'}
            disabled={isBusy || !process.actions.stop.enabled}
            title={process.actions.stop.reason}
            onClick={() => onAction(process.id, 'stop')}
          />
        </div>
      </td>
    </tr>
  );
}
