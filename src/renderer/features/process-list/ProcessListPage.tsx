import { useMemo, useRef, useState } from 'react';
import type { ProcessAction } from '../../../shared/process';
import {
  ProcessCommandLogBar,
  type ProcessCommandLogEntry
} from './components/ProcessCommandLogBar';
import { ProcessFilterBar } from './components/ProcessFilterBar';
import { ProcessDetailPanel } from './components/ProcessDetailPanel';
import { EmptyState, ErrorState, LoadingState } from './components/ProcessListStates';
import { ProcessListTable } from './components/ProcessListTable';
import { useProcessCollection } from './hooks/useProcessCollection';
import { useProcessSelection } from './hooks/useProcessSelection';
import {
  createProcessGatewayWithOptions,
  type ProcessGateway
} from './services/processGateway';

export interface ProcessListPageProps {
  gateway?: ProcessGateway;
}

function isFixtureModeEnabled(): boolean {
  const mode = import.meta.env.VITE_C3_TEST_MODE;
  return mode === '1' || mode === 'true';
}

export function ProcessListPage({ gateway }: ProcessListPageProps) {
  const [pendingActionsByProcessId, setPendingActionsByProcessId] = useState<
    Partial<Record<string, ProcessAction>>
  >({});
  const [commandLogEntries, setCommandLogEntries] = useState<ProcessCommandLogEntry[]>([]);
  const logCounter = useRef(0);

  const effectiveGateway = useMemo(
    () =>
      gateway ??
      createProcessGatewayWithOptions(window.c3Desktop, {
        allowFixtureFallback: isFixtureModeEnabled()
      }),
    [gateway]
  );
  const { state, setSearch, setSource, setStatus, reload } = useProcessCollection(effectiveGateway);
  const { selectedProcessId, selectedProcess, selectProcess } = useProcessSelection(state.items);

  function appendCommandLog(entry: Omit<ProcessCommandLogEntry, 'id'>) {
    setCommandLogEntries((previous) => [
      {
        id: logCounter.current++,
        ...entry
      },
      ...previous
    ].slice(0, 120));
  }

  function actionProgressLabel(action: ProcessAction): string {
    if (action === 'start') {
      return 'Starting...';
    }

    if (action === 'stop') {
      return 'Stopping...';
    }

    return 'Restarting...';
  }

  async function handleAction(processId: string, action: ProcessAction) {
    const processName = state.items.find((item) => item.id === processId)?.name ?? processId;

    setPendingActionsByProcessId((previous) => ({
      ...previous,
      [processId]: action
    }));

    appendCommandLog({
      timestampIso: new Date().toISOString(),
      processName,
      action,
      message: actionProgressLabel(action),
      accepted: undefined
    });

    try {
      const response = await effectiveGateway.sendProcessCommand({ processId, action });

      appendCommandLog({
        timestampIso: new Date().toISOString(),
        processName,
        action,
        message: response.message,
        command: response.command,
        output: response.output,
        accepted: response.accepted
      });
    } catch (error) {
      appendCommandLog({
        timestampIso: new Date().toISOString(),
        processName,
        action,
        message: error instanceof Error ? error.message : 'Failed to run process command.',
        accepted: false
      });
    } finally {
      setPendingActionsByProcessId((previous) => {
        const next = { ...previous };
        delete next[processId];
        return next;
      });
      await reload();
    }
  }

  return (
    <section className="process-page">
      <ProcessFilterBar
        query={state.query}
        onSearchChange={setSearch}
        onSourceChange={setSource}
        onStatusChange={setStatus}
        onRefresh={() => {
          void reload();
        }}
        isRefreshing={state.isLoading}
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
              pendingActionsByProcessId={pendingActionsByProcessId}
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

      <ProcessCommandLogBar entries={commandLogEntries} />
    </section>
  );
}
