import { Link, useParams } from 'react-router-dom';
import { StateView } from '@/components/StateView';
import { useAmbassadors } from '@/features/ambassadors/AmbassadorsProvider';

export function AmbassadorDetailPage() {
  const { ambassadorId = '' } = useParams();
  const { ambassadors, loading, error, reload } = useAmbassadors();
  const ambassador = ambassadors.find((item) => item.id === ambassadorId);

  return (
    <section>
      <Link to="/external-ambassador/ambassadors">Back to ambassadors</Link>
      <StateView
        status={loading ? 'loading' : error ? 'error' : ambassador ? 'ready' : 'empty'}
        error={error || undefined}
        onRetry={() => void reload()}
        emptyTitle="Ambassador not found"
        emptyBody="This ambassador is not in the current list."
      >
        {ambassador ? (
          <article className="panel detail-card">
            <div className="avatar" aria-hidden="true">{ambassador.name.slice(0, 1)}</div>
            <div>
              <h2>{ambassador.name}</h2>
              <p className="muted">@{ambassador.username}</p>
            </div>
            <dl className="detail-list">
              <div><dt>Email</dt><dd>{ambassador.email}</dd></div>
              <div><dt>Phone</dt><dd>{ambassador.phone || 'Not provided'}</dd></div>
              <div><dt>Website</dt><dd>{ambassador.website || 'Not provided'}</dd></div>
              <div><dt>City</dt><dd>{ambassador.city || 'Not provided'}</dd></div>
              <div><dt>Company</dt><dd>{ambassador.company || 'Not provided'}</dd></div>
            </dl>
          </article>
        ) : null}
      </StateView>
    </section>
  );
}
