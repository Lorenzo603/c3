import type { ProcessListQuery, ProcessSource, ProcessStatus } from '../../../../shared/process';

export interface ProcessFilterBarProps {
  query: ProcessListQuery;
  onSearchChange: (value: string) => void;
  onSourceChange: (value: ProcessSource | 'all') => void;
  onStatusChange: (value: ProcessStatus | 'all') => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ProcessFilterBar({
  query,
  onSearchChange,
  onSourceChange,
  onStatusChange,
  onRefresh,
  isRefreshing = false
}: ProcessFilterBarProps) {
  return (
    <section className="filter-bar" aria-label="Process filters">
      <label className="filter-group">
        <span>Search</span>
        <input
          value={query.search ?? ''}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Process name or description"
          aria-label="Search processes"
        />
      </label>

      <label className="filter-group">
        <span>Source</span>
        <select
          value={query.source ?? 'all'}
          onChange={(event) => onSourceChange(event.target.value as ProcessSource | 'all')}
          aria-label="Filter by source"
        >
          <option value="all">All sources</option>
          <option value="native">Native</option>
          <option value="docker">Docker</option>
          <option value="database">Database</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      <label className="filter-group">
        <span>Status</span>
        <select
          value={query.status ?? 'all'}
          onChange={(event) => onStatusChange(event.target.value as ProcessStatus | 'all')}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="running">Running</option>
          <option value="degraded">Degraded</option>
          <option value="starting">Starting</option>
          <option value="stopping">Stopping</option>
          <option value="stopped">Stopped</option>
          <option value="unknown">Unknown</option>
        </select>
      </label>

      <div className="filter-refresh-group">
        <button
          type="button"
          className="filter-refresh-button"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}
