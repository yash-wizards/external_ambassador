import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchProfile } from '@/services/intotoApi';
import { userFacingStatus } from '@/services/http';

export function AccountPage() {
  const { user, mode, http } = useAuth();
  const [picture, setPicture] = useState(user?.picture);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'live' || user?.source !== 'live') return undefined;
    const controller = new AbortController();
    void fetchProfile(http)
      .then((profile) => {
        if (profile.picture) setPicture(profile.picture);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setProfileError(userFacingStatus(error).message);
      });
    return () => controller.abort();
  }, [http, mode, user?.source]);

  if (!user) {
    return (
      <section className="panel">
        <h2>Account</h2>
        <p className="muted">Sign in only if you want to manage your profile. Browsing the home page does not require an account.</p>
        <Link className="btn" to="/external-ambassador/login">Sign in</Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Account</h2>
      {picture ? (
        <img className="avatar" src={picture} alt="" />
      ) : (
        <div className="avatar">{user.firstName.slice(0, 1) || user.email.slice(0, 1)}</div>
      )}
      <p><strong>{user.name}</strong></p>
      <p className="muted">{user.email}</p>
      <p>Role: {user.roleLabel}</p>
      <p className="muted">Session source: {user.source === 'mock' ? 'Mock adapter' : 'INTOTO API'}</p>
      {profileError ? (
        <p className="banner error" role="alert">Profile details could not be refreshed. {profileError}</p>
      ) : null}
      <p className="muted">Use Log out in the header to end this session on this device.</p>
    </section>
  );
}
