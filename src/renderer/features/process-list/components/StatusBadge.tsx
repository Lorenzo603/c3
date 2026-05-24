import type { ProcessStatus } from '../../../../shared/process';

const LABELS: Record<ProcessStatus, string> = {
  running: 'Running',
  stopped: 'Stopped',
  starting: 'Starting',
  stopping: 'Stopping',
  degraded: 'Degraded',
  unknown: 'Unknown'
};

export interface StatusBadgeProps {
  status: ProcessStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-${status}`}>{LABELS[status]}</span>;
}
