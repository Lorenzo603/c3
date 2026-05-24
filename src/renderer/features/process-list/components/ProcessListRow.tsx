import type { ProcessAction, ProcessSummary } from '../../../../shared/process';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';

export interface ProcessListRowProps {
  process: ProcessSummary;
  isSelected: boolean;
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

export function ProcessListRow({ process, isSelected, onSelect, onAction }: ProcessListRowProps) {
  return (
    <tr
      className={isSelected ? 'process-row selected' : 'process-row'}
      onClick={() => onSelect(process.id)}
      aria-selected={isSelected}
    >
      <td>
        <div className="process-name-cell">
          <strong>{process.name}</strong>
          <small>{process.description ?? 'No description'}</small>
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
            label="Start"
            disabled={!process.actions.start.enabled}
            title={process.actions.start.reason}
            onClick={() => onAction(process.id, 'start')}
          />
          <ActionButton
            label="Stop"
            disabled={!process.actions.stop.enabled}
            title={process.actions.stop.reason}
            onClick={() => onAction(process.id, 'stop')}
          />
          <ActionButton
            label="Restart"
            disabled={!process.actions.restart.enabled}
            title={process.actions.restart.reason}
            onClick={() => onAction(process.id, 'restart')}
          />
        </div>
      </td>
    </tr>
  );
}
