import { useEffect, useMemo, useState } from 'react';
import type { ProcessSummary } from '../../../../shared/process';

export function useProcessSelection(items: ProcessSummary[]) {
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedProcessId(null);
      return;
    }

    if (!selectedProcessId || !items.some((item) => item.id === selectedProcessId)) {
      setSelectedProcessId(items[0]?.id ?? null);
    }
  }, [items, selectedProcessId]);

  const selectedProcess = useMemo(
    () => items.find((item) => item.id === selectedProcessId),
    [items, selectedProcessId]
  );

  return {
    selectedProcessId,
    selectedProcess,
    selectProcess: setSelectedProcessId
  };
}
