import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StateView } from '@/components/StateView';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getMockCommunity, listMockCommunities, setMockMembership } from '@/mocks/store';
import { userFacingStatus } from '@/services/http';
import { fetchCommunities, fetchCommunity, joinCommunity, leaveCommunity } from '@/services/intotoApi';
import type { Community, Page } from '@/types/domain';

export function CommunitiesPage() {
  const { mode, user, http } = useAuth();
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Page<Community> | null>(null);
  const requestRef = useRef(0);
  const live = mode === 'live' && user?.source === 'live';

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setStatus('loading');
    setError(null);
    const run = async () => {
      const next = live
        ? await fetchCommunities(http, { page, pageSize: 8, search: debounced }, controller.signal)
        : listMockCommunities(debounced, page, 8);
      if (requestId !== requestRef.current) return;
      setResult(next);
      setStatus(next.docs.length ? 'ready' : 'empty');
    };
    void run().catch((err: unknown) => {
      if (controller.signal.aborted || requestId !== requestRef.current) return;
      setError(userFacingStatus(err).message);
      setStatus('error');
    });
    return () => controller.abort();
  }, [debounced, http, live, page, reloadKey]);

  return (
    <section>
      <h2>Communities</h2>
      <p className="muted">Communities available to your external ambassador account.</p>
      <div className="toolbar">
        <label className="field" style={{ margin: 0, flex: 1 }}>
          <span className="sr-only">Search communities</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search communities" />
        </label>
      </div>
      <StateView status={status} error={error || undefined} onRetry={() => setReloadKey((current) => current + 1)} emptyTitle="No communities" emptyBody="No communities match this search.">
        <div className="list">
          {result?.docs.map((community) => (
            <Link key={community.id} className="row" to={`/external-ambassador/communities/${community.id}`}>
              <span>
                <strong>{community.name}</strong>
                <p className="muted">{community.description}</p>
                <p className="muted">{community.memberCount} members · {community.category}</p>
              </span>
              <span className={community.source === 'mock' ? 'tag warn' : 'tag'}>
                {community.joined ? 'Joined' : community.source === 'mock' ? 'Sample' : 'Open'}
              </span>
            </Link>
          ))}
        </div>
        <div className="pager">
          <button className="btn secondary" type="button" disabled={!result?.hasPrevPage} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <span className="muted">Page {result?.page || page}</span>
          <button className="btn secondary" type="button" disabled={!result?.hasNextPage} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      </StateView>
    </section>
  );
}

export function CommunityDetailPage() {
  const { communityId = '' } = useParams();
  const { mode, user, http } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const live = mode === 'live' && user?.source === 'live';

  const load = () => {
    setStatus('loading');
    const run = async () => {
      const next = live ? await fetchCommunity(http, communityId) : getMockCommunity(communityId);
      setCommunity(next);
      setStatus('ready');
    };
    void run().catch((err: unknown) => {
      setError(userFacingStatus(err).message);
      setStatus('error');
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, live]);

  const toggle = async () => {
    if (!community || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (live) {
        if (community.joined) await leaveCommunity(http, community.id);
        else await joinCommunity(http, community.id);
        const next = await fetchCommunity(http, community.id);
        setCommunity(next);
      } else {
        setCommunity(setMockMembership(community.id, !community.joined));
      }
      setNotice(community.joined ? 'You left the community.' : 'You joined the community.');
    } catch (err) {
      setError(userFacingStatus(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <Link to="/external-ambassador/communities">Back to communities</Link>
      <StateView status={status} error={error || undefined} onRetry={load}>
        {community ? (
          <article className="panel">
            {community.imageUrl ? <img className="avatar" src={community.imageUrl} alt="" /> : <div className="avatar">{community.name.slice(0, 1)}</div>}
            <h2>{community.name}</h2>
            <p>{community.description || 'No description provided.'}</p>
            <p className="muted">{community.memberCount} members · {community.category}</p>
            {community.source === 'mock' ? <p className="tag warn">Sample community</p> : null}
            {notice ? <p className="banner info" role="status">{notice}</p> : null}
            {error ? <p className="banner error" role="alert">{error}</p> : null}
            <button className="btn" type="button" onClick={() => void toggle()} disabled={busy}>
              {busy ? 'Saving…' : community.joined ? 'Leave' : 'Join'}
            </button>
          </article>
        ) : null}
      </StateView>
    </section>
  );
}
