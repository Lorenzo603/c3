import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetProcessListResponse, ProcessListQuery } from '../../../../shared/process';
import type { ProcessGateway } from '../services/processGateway';

export interface ProcessCollectionState {
  items: GetProcessListResponse['items'];
  fetchedAtIso?: string;
  query: ProcessListQuery;
  isLoading: boolean;
  error?: string;
}

const INITIAL_QUERY: ProcessListQuery = {
  search: '',
  source: 'all',
  status: 'all'
};

export function useProcessCollection(gateway: ProcessGateway) {
  const [state, setState] = useState<ProcessCollectionState>({
    items: [],
    query: INITIAL_QUERY,
    isLoading: true
  });

  const load = useCallback(async (query: ProcessListQuery) => {
    setState((previous) => ({
      ...previous,
      query,
      isLoading: true,
      error: undefined
    }));

    try {
      const response = await gateway.getProcessList({ query });
      setState((previous) => ({
        ...previous,
        items: response.items,
        fetchedAtIso: response.fetchedAtIso,
        isLoading: false,
        error: undefined
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unable to load processes.'
      }));
    }
  }, [gateway]);

  useEffect(() => {
    void load(state.query);
  }, [load, state.query]);

  const updateQuery = useCallback((next: Partial<ProcessListQuery>) => {
    setState((previous) => ({
      ...previous,
      query: {
        ...previous.query,
        ...next
      }
    }));
  }, []);

  const actions = useMemo(() => ({
    setSearch(search: string) {
      updateQuery({ search });
    },
    setSource(source: ProcessListQuery['source']) {
      updateQuery({ source });
    },
    setStatus(status: ProcessListQuery['status']) {
      updateQuery({ status });
    },
    reload() {
      return load(state.query);
    }
  }), [load, state.query, updateQuery]);

  return {
    state,
    ...actions
  };
}
