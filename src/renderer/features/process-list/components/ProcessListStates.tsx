export function LoadingState() {
  return <div className="list-state">Loading process snapshot...</div>;
}

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="list-state" role="alert">
      <p>Unable to load process data: {message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function EmptyState() {
  return <div className="list-state">No processes match the current filter set.</div>;
}
