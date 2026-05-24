import { useMemo } from 'react';
import type { ProcessAction } from '../../../shared/process';
import { ProcessFilterBar } from './components/ProcessFilterBar';
import { ProcessDetailPanel } from './components/ProcessDetailPanel';
import { EmptyState, ErrorState, LoadingState } from './components/ProcessListStates';
import { ProcessListTable } from './components/ProcessListTable';
import { useProcessCollection } from './hooks/useProcessCollection';
import { useProcessSelection } from './hooks/useProcessSelection';
import { createProcessGateway, type ProcessGateway } from './services/processGateway';

export interface ProcessListPageProps {
  gateway?: ProcessGateway;
}

export function ProcessListPage({ gateway }: ProcessListPageProps) {
  const effectiveGateway = useMemo(() => gateway ?? createProcessGateway(), [gateway]);
  const { state, setSearch, setSource, setStatus, reload } = useProcessCollection(effectiveGateway);
  const { selectedProcessId, selectedProcess, selectProcess } = useProcessSelection(state.items);

  async function handleAction(processId: string, action: ProcessAction) {
    await effectiveGateway.sendProcessCommand({ processId, action });
    await reload();
  }

  return (
    <section className="process-page">
      <ProcessFilterBar
        query={state.query}
        onSearchChange={setSearch}
        onSourceChange={setSource}
        onStatusChange={setStatus}
      />

      <div className="process-content">
        <section className="process-list-surface" aria-label="Process list section">
          {state.isLoading && <LoadingState />}

          {!state.isLoading && state.error && (
            <ErrorState message={state.error} onRetry={() => void reload()} />
          )}

          {!state.isLoading && !state.error && state.items.length === 0 && <EmptyState />}

          {!state.isLoading && !state.error && state.items.length > 0 && (
            <ProcessListTable
              items={state.items}
              selectedProcessId={selectedProcessId}
              onSelect={selectProcess}
              onAction={(processId, nextAction) => {
                void handleAction(processId, nextAction);
              }}
            />
          )}
        </section>

        <aside className="process-detail-surface" aria-label="Process detail section">
          <ProcessDetailPanel process={selectedProcess} fetchedAtIso={state.fetchedAtIso} />
        </aside>
      </div>
    </section>
  );
}
