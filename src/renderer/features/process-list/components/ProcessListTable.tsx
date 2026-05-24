import type { ProcessAction, ProcessSummary } from '../../../../shared/process';
import { ProcessListRow } from './ProcessListRow';

export interface ProcessListTableProps {
  items: ProcessSummary[];
  selectedProcessId: string | null;
  onSelect: (processId: string) => void;
  onAction: (processId: string, action: ProcessAction) => void;
}

export function ProcessListTable({
  items,
  selectedProcessId,
  onSelect,
  onAction
}: ProcessListTableProps) {
  return (
    <div className="process-table-wrapper">
      <table className="process-table">
        <thead>
          <tr>
            <th>Process</th>
            <th>Source</th>
            <th>Status</th>
            <th>Health</th>
            <th>PID</th>
            <th>Ports</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <ProcessListRow
              key={item.id}
              process={item}
              isSelected={item.id === selectedProcessId}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
