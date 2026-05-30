import type { ProcessSource } from '../../../../shared/process';

const LABELS: Record<ProcessSource, string> = {
  native: 'Native',
  docker: 'Docker',
  database: 'Database',
  custom: 'Custom',
  scripts: 'Scripts'
};

export interface SourceBadgeProps {
  source: ProcessSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return <span className={`source-badge source-${source}`}>{LABELS[source]}</span>;
}
