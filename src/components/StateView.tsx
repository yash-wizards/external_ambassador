import type { ReactNode } from 'react';

interface StateViewProps {
  status: 'loading' | 'empty' | 'error' | 'ready';
  emptyTitle?: string;
  emptyBody?: string;
  error?: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function StateView({ status, emptyTitle, emptyBody, error, onRetry, children }: StateViewProps) {
  if (status === 'loading') {
    return (
      <div className="list" aria-busy="true" aria-live="polite">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="state" role="alert">
        <h2>Something went wrong</h2>
        <p className="muted">{error || 'The request failed.'}</p>
        {onRetry ? (
          <button className="btn" type="button" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <div className="state">
        <h2>{emptyTitle || 'Nothing here yet'}</h2>
        <p className="muted">{emptyBody || 'There is no data to show.'}</p>
      </div>
    );
  }

  return <>{children}</>;
}
