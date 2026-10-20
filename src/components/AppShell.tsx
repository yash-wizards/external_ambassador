import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useContainerLayout } from '@/hooks/useContainerLayout';

const links = [
  { to: '/external-ambassador', label: 'Home', end: true },
  { to: '/external-ambassador/ambassadors', label: 'Ambassadors', end: false },
  { to: '/external-ambassador/chat', label: 'Chat', end: false },
  { to: '/external-ambassador/communities', label: 'Communities', end: false },
  { to: '/external-ambassador/vendors', label: 'Vendors', end: false },
  { to: '/external-ambassador/account', label: 'Account', end: false },
];

export function AppShell() {
  const { user, mode, logout } = useAuth();
  const location = useLocation();
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const layout = useContainerLayout(frame);
  const [busy, setBusy] = useState(false);
  const isHome = location.pathname === '/external-ambassador';

  const onLogout = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  if (isHome) {
    return (
      <div className="home-frame">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-frame" data-layout={layout} ref={setFrame}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" aria-hidden="true">IN</div>
          <div>
            <h1>External Ambassador</h1>
            <p>{user ? user.roleLabel : 'Browse without signing in'}</p>
          </div>
        </div>
        <div className="user-menu">
          {user ? (
            <>
              <span className="muted">{user.name}</span>
              <button className="btn ghost" type="button" onClick={() => void onLogout()} disabled={busy}>
                {busy ? 'Signing out…' : 'Log out'}
              </button>
            </>
          ) : (
            <Link className="btn" to="/external-ambassador/login">
              Sign in
            </Link>
          )}
        </div>
      </header>
      {mode === 'mock' ? (
        <div className="banner" role="status">
          You can browse without signing in. Ambassadors use the JSONPlaceholder fake API,
          while communities use local sample data until INTOTO authentication is configured.
        </div>
      ) : user ? (
        <div className="banner info" role="status">
          Signed in to INTOTO. Ambassador and community lists load from the API. Vendor information remains sample data.
        </div>
      ) : (
        <div className="banner info" role="status">
          Sign-in is optional. The public lists stay available, and signing in loads your university&apos;s ambassadors and communities.
        </div>
      )}
      <div className="shell">
        <nav className="sidebar" aria-label="Primary" hidden={layout === 'compact'}>
          {links.map((link) => (
            <NavLink key={link.to} className="nav-link" to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <div className="bottom-nav" hidden={layout !== 'compact'}>
        <nav aria-label="Primary mobile">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
