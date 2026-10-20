import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StateView } from '@/components/StateView';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getMockVendor, listMockVendors, setMockFailure } from '@/mocks/store';
import type { Page, Vendor } from '@/types/domain';

const categories = ['', 'Housing', 'Transport'];

export function VendorsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Page<Vendor> | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debounced, category]);

  useEffect(() => {
    setStatus('loading');
    const timer = window.setTimeout(() => {
      try {
        const next = listMockVendors(debounced, category, page, 6);
        setResult(next);
        setError(null);
        setStatus(next.docs.length ? 'ready' : 'empty');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Vendor service is unavailable.');
        setStatus('error');
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [category, debounced, page, reloadKey]);

  return (
    <section>
      <h2>Vendor information</h2>
      <p className="banner">
        INTOTO does not expose a vendor API. These records are isolated mock data and are not authorized vendor records.
      </p>
      <div className="toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors" aria-label="Search vendors" />
        <select value={category} aria-label="Vendor category" onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => (
            <option key={item || 'all'} value={item}>{item || 'All categories'}</option>
          ))}
        </select>
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setMockFailure('vendors', true);
            setReloadKey((current) => current + 1);
          }}
        >
          Simulate API error
        </button>
      </div>
      <StateView
        status={status}
        error={error || undefined}
        onRetry={() => {
          setMockFailure('vendors', false);
          setReloadKey((current) => current + 1);
        }}
        emptyTitle="No vendors"
        emptyBody="No sample vendors match this search."
      >
        <div className="list">
          {result?.docs.map((vendor) => (
            <Link className="row" key={vendor.id} to={`/external-ambassador/vendors/${vendor.id}`}>
              <VendorMark vendor={vendor} />
              <span>
                <strong>{vendor.name}</strong>
                <p className="muted">{vendor.description}</p>
              </span>
              <span className="tag warn">Sample</span>
            </Link>
          ))}
        </div>
      </StateView>
    </section>
  );
}

export function VendorDetailPage() {
  const { vendorId = '' } = useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setStatus('loading');
    try {
      setVendor(getMockVendor(vendorId));
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vendor not found');
      setStatus('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  return (
    <section>
      <Link to="/external-ambassador/vendors">Back to vendors</Link>
      <StateView status={status} error={error || undefined} onRetry={load}>
        {vendor ? (
          <article className="panel">
            <VendorMark vendor={vendor} />
            <h2>{vendor.name}</h2>
            <p className="tag warn">Sample data</p>
            <p>{vendor.description}</p>
            <p className="muted">Category: {vendor.category}</p>
            {vendor.contactEmail ? <p>Email: {vendor.contactEmail}</p> : <p className="muted">No email listed.</p>}
            {vendor.contactPhone ? <p>Phone: {vendor.contactPhone}</p> : null}
            {vendor.website ? <p>Website: {vendor.website}</p> : null}
          </article>
        ) : null}
      </StateView>
    </section>
  );
}

function VendorMark({ vendor }: { vendor: Vendor }) {
  const [failed, setFailed] = useState(false);
  if (!vendor.logoUrl || failed) {
    return <div className="avatar" aria-hidden="true">{vendor.name.slice(0, 1)}</div>;
  }
  return <img className="avatar" src={vendor.logoUrl} alt="" onError={() => setFailed(true)} />;
}
