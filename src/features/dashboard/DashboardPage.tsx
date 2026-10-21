import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StateView } from '@/components/StateView';
import { useAmbassadors } from '@/features/ambassadors/AmbassadorsProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { getConfig } from '@/config/env';
import { resolveTenantDomain } from '@/config/tenantDomain';
import { listMockCommunities } from '@/mocks/store';
import { userFacingStatus } from '@/services/http';
import { fetchCommunities } from '@/services/intotoApi';
import { captureEmbedderUrl, getEmbedderUrl, subscribeEmbedderUrl } from '@/services/embedderUrl';
import { fetchTenant, type TenantInfo } from '@/services/tenantApi';
import type { Ambassador, Community } from '@/types/domain';

type Audience = 'all' | 'online' | 'Student' | 'Alumni' | 'Staff' | 'program' | 'country';
type RoleName = 'Student' | 'Alumni' | 'Staff';

const FILTERS: { id: Audience; label: string }[] = [
  { id: 'all', label: 'All Ambassadors' },
  { id: 'online', label: 'Available Now' },
  { id: 'Student', label: 'Students' },
  { id: 'Alumni', label: 'Alumni' },
  { id: 'Staff', label: 'Staff' },
  { id: 'program', label: 'By Program' },
  { id: 'country', label: 'By Country' },
];

const COVERS = ['/home/cover-1.png', '/home/cover-2.png', '/home/cover-3.png', '/home/cover-4.png'];
const MARKS = ['/home/mark-1.png', '/home/mark-2.png', '/home/mark-3.png', '/home/mark-4.png'];
const LAST_SEEN = ['2 hours ago', '5 hours ago', '1 day ago', '3 days ago'];

const FAQS = [
  {
    question: 'What is campus life like for international students?',
    answer:
      "Campus life is incredibly diverse and welcoming! As an international student from Bangladesh, I was initially nervous, but the university has amazing support services. There are cultural clubs, international student mixers every month, and tons of events. The campus is very inclusive, and you'll find students from over 100 countries. My favorite part is the international food festival we host every semester!",
  },
  {
    question: 'How do I start a chat with an ambassador?',
    answer:
      'Choose Chat on an ambassador card. You can read the conversation and send a message without creating an account first.',
  },
  {
    question: 'Do I need an account to browse communities?',
    answer:
      'No. Community cards on this page are open to browse. Join opens the community so you can see what members are talking about.',
  },
  {
    question: 'Who will I be talking to?',
    answer:
      'Cards include students, alumni, and staff. Use the filters to focus on the group you want, or search by name, program, or country.',
  },
  {
    question: 'Is signing in required?',
    answer:
      'Signing in is optional. Login/Signup is there when you want a personal session. The ambassador and community lists stay available either way.',
  },
];

function roleFor(id: string): RoleName {
  const value = Number.parseInt(id, 10);
  const index = Number.isFinite(value) ? Math.abs(value - 1) % 3 : 0;
  return (['Student', 'Alumni', 'Staff'] as const)[index];
}

function isOnline(id: string) {
  const value = Number.parseInt(id, 10);
  return Number.isFinite(value) ? value % 2 === 1 : false;
}

function detailLabel(role: RoleName) {
  if (role === 'Staff') return 'Job Title';
  if (role === 'Alumni') return 'Completed Program';
  return 'Program';
}

export function DashboardPage() {
  const { mode, http, user, logout } = useAuth();
  const {
    ambassadors,
    loading: ambassadorsLoading,
    error: ambassadorError,
    reload: reloadAmbassadors,
  } = useAmbassadors();
  const live = mode === 'live' && user?.source === 'live';
  const [communityStatus, setCommunityStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [program, setProgram] = useState('');
  const [country, setCountry] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [tenantStatus, setTenantStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [hostUrl, setHostUrl] = useState<string | null>(() => getEmbedderUrl());
  const tenantDomain = resolveTenantDomain(window.location.hostname, getConfig().tenantDomain);

  const load = () => {
    setCommunityStatus('loading');
    setCommunityError(null);

    void Promise.resolve()
      .then(() => (live ? fetchCommunities(http, { page: 1, pageSize: 4, search: '' }) : listMockCommunities('', 1, 4)))
      .then((next) => {
        setCommunities(next.docs);
        setCommunityStatus(next.docs.length ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        setCommunities([]);
        setCommunityError(userFacingStatus(error).message);
        setCommunityStatus('error');
      });
  };

  useEffect(() => {
    load();
    // Reload when the visitor signs in so live lists can replace the public catalog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, user?.id]);

  useEffect(() => {
    captureEmbedderUrl();
    setHostUrl(getEmbedderUrl());
    return subscribeEmbedderUrl(setHostUrl);
  }, []);

  useEffect(() => {
    if (!tenantDomain) {
      setTenant(null);
      setTenantError(null);
      setTenantStatus('empty');
      return;
    }

    let cancelled = false;
    setTenantStatus('loading');
    setTenantError(null);
    void fetchTenant(http, tenantDomain)
      .then((next) => {
        if (cancelled) return;
        setTenant(next);
        setTenantStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTenant(null);
        setTenantError(userFacingStatus(error).message);
        setTenantStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [http, tenantDomain]);

  const programs = useMemo(
    () => [...new Set(ambassadors.map((item) => item.company).filter(Boolean))],
    [ambassadors],
  );
  const countries = useMemo(
    () => [...new Set(ambassadors.map((item) => item.city).filter(Boolean))],
    [ambassadors],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ambassadors.filter((ambassador) => {
      const role = roleFor(ambassador.id);
      if (audience === 'online' && !isOnline(ambassador.id)) return false;
      if (audience === 'Student' || audience === 'Alumni' || audience === 'Staff') {
        if (role !== audience) return false;
      }
      if (audience === 'program' && program && ambassador.company !== program) return false;
      if (audience === 'country' && country && ambassador.city !== country) return false;
      if (!needle) return true;
      return [ambassador.name, ambassador.username, ambassador.company, ambassador.city, role]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [ambassadors, audience, country, program, query]);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(draft);
  };

  const selectAudience = (next: Audience) => {
    setAudience(next);
    if (next !== 'program') setProgram('');
    if (next !== 'country') setCountry('');
  };

  const resetFilters = () => {
    setDraft('');
    setQuery('');
    setAudience('all');
    setProgram('');
    setCountry('');
  };

  const onLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="ea-home">
      <header className="ea-top">
        <div className="ea-intro">
          <div className="ea-tenant" aria-live="polite">
            {tenantStatus === 'loading' ? <p>Loading university…</p> : null}
            {tenant ? (
              <p>
                <strong>{tenant.name}</strong>
                {tenant.shortCode ? <span>{tenant.shortCode}</span> : null}
                {tenant.tenantKey ? <span>{tenant.tenantKey}</span> : null}
              </p>
            ) : null}
            {tenantStatus === 'error' ? <p className="ea-tenant-error">{tenantError}</p> : null}
            {tenantStatus === 'empty' ? (
              <p className="ea-tenant-error">Open this page from a university address to load tenant details.</p>
            ) : null}
            {hostUrl ? (
              <p className="ea-host">
                Added on <a href={hostUrl}>{hostUrl}</a>
              </p>
            ) : null}
          </div>
          <div className="ea-title-row">
            <h1>Student Ambassadors</h1>
            <div className="ea-tools">
              <Link className="ea-icon-link" to="/external-ambassador/chat" aria-label="Open chat">
                <img src="/home/login.svg" alt="" />
              </Link>
              {user ? (
                <button className="ea-logout" type="button" onClick={() => void onLogout()} disabled={signingOut}>
                  {signingOut ? 'Signing out…' : 'Log out'}
                </button>
              ) : (
                <Link className="ea-login" to="/external-ambassador/login">
                  Login/ Signup
                </Link>
              )}
              <p className="ea-powered">
                Powered by
                <img src="/home/logo.png" alt="INTOTO" />
              </p>
            </div>
          </div>
          <p className="ea-subtitle">
            Discover real insights from students, alumni ambassadors, and university representatives. Learn about
            their journeys, experiences, and everyday life on campus — directly from our ambassadors.
          </p>
        </div>

        <form className="ea-search-row" onSubmit={onSearch}>
          <label className="ea-search">
            <img src="/home/search.svg" alt="" />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search ambassadors, programs, countries…"
              aria-label="Search ambassadors, programs, countries"
            />
          </label>
          <button className="ea-search-btn" type="submit">
            Search
          </button>
        </form>

        <div className="ea-filters" role="toolbar" aria-label="Ambassador filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={audience === item.id ? 'is-active' : undefined}
              aria-pressed={audience === item.id}
              onClick={() => selectAudience(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="ea-filter-reset" type="button" aria-label="Reset filters" onClick={resetFilters}>
            <img src="/home/filter.svg" alt="" />
          </button>
        </div>
        {audience === 'program' && programs.length ? (
          <div className="ea-subfilters" role="group" aria-label="Programs">
            {programs.map((item) => (
              <button key={item} type="button" aria-pressed={program === item} onClick={() => setProgram(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : null}
        {audience === 'country' && countries.length ? (
          <div className="ea-subfilters" role="group" aria-label="Countries">
            {countries.map((item) => (
              <button key={item} type="button" aria-pressed={country === item} onClick={() => setCountry(item)}>
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <section className="ea-section" aria-labelledby="ambassador-list-title">
        <h2 id="ambassador-list-title">Chat with Our Ambassadors</h2>
        <StateView
          status={
            ambassadorsLoading ? 'loading' : ambassadorError ? 'error' : visible.length ? 'ready' : 'empty'
          }
          error={ambassadorError || undefined}
          onRetry={() => void reloadAmbassadors()}
          emptyTitle="No ambassadors"
          emptyBody="No ambassadors match this search."
        >
          <div className="ea-grid">
            {visible.slice(0, 4).map((ambassador) => (
              <AmbassadorCard key={ambassador.id} ambassador={ambassador} />
            ))}
          </div>
        </StateView>
        <Link className="ea-more" to="/external-ambassador/ambassadors">
          See More<span className="sr-only"> ambassadors</span>
        </Link>
      </section>

      <section className="ea-section" aria-labelledby="community-list-title">
        <h2 id="community-list-title">Community</h2>
        <StateView
          status={communityStatus}
          error={communityError || undefined}
          onRetry={load}
          emptyTitle="No communities"
          emptyBody="No communities are available right now."
        >
          <div className="ea-grid">
            {communities.slice(0, 4).map((community, index) => (
              <CommunityCard key={community.id} community={community} index={index} />
            ))}
          </div>
        </StateView>
        <Link className="ea-more" to="/external-ambassador/communities">
          See More<span className="sr-only"> communities</span>
        </Link>
      </section>

      <section className="ea-section" aria-labelledby="faq-title">
        <h2 id="faq-title">Ambassador FAQ</h2>
        <div className="ea-faq">
          {FAQS.map((item, index) => {
            const open = openFaq === index;
            return (
              <article key={item.question} className={open ? 'is-open' : undefined}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? -1 : index)}
                  >
                    {item.question}
                    <span className="ea-chevron">
                      <img src="/home/chevron.svg" alt="" />
                    </span>
                  </button>
                </h3>
                {open ? <p>{item.answer}</p> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AmbassadorCard({ ambassador }: { ambassador: Ambassador }) {
  const role = roleFor(ambassador.id);
  const online = isOnline(ambassador.id);
  const seen = LAST_SEEN[Math.abs(Number.parseInt(ambassador.id, 10) || 0) % LAST_SEEN.length];

  return (
    <article className="ea-ambassador">
      <div className="ea-card-top">
        <p className={online ? 'is-online' : undefined}>{online ? 'Online' : `Last online ${seen}`}</p>
        <span>{role}</span>
      </div>
      <div className="ea-avatar">
        <img src="/home/avatar.png" alt="" />
        <img className="ea-flag" src="/home/flag.png" alt="" />
        {online ? <span className="ea-dot" /> : null}
      </div>
      <h3>{ambassador.name}</h3>
      <p className="ea-country">{ambassador.city}</p>
      <hr />
      <p className="ea-label">{detailLabel(role)}</p>
      <p className="ea-value">{ambassador.company}</p>
      <Link className="ea-chat" to="/external-ambassador/chat">
        <img src="/home/chat.svg" alt="" />
        Chat
      </Link>
    </article>
  );
}

function CommunityCard({ community, index }: { community: Community; index: number }) {
  return (
    <article className="ea-community">
      <img className="ea-cover" src={COVERS[index % COVERS.length]} alt="" />
      <img className="ea-mark" src={MARKS[index % MARKS.length]} alt="" />
      <h3>{community.name}</h3>
      <p className="ea-stats">
        <span>{community.category}</span>
        <span>
          <strong>{community.memberCount}</strong> followers
        </span>
      </p>
      <Link to={`/external-ambassador/communities/${community.id}`}>Join</Link>
    </article>
  );
}
