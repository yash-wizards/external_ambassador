import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { validateEmail, validateMockPassword } from '@/features/auth/credentials';
import { useAuth } from '@/features/auth/AuthProvider';
import { MOCK_EMAIL } from '@/mocks/fixtures';

export function LoginPage() {
  const { user, mode, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/external-ambassador';
  const [email, setEmail] = useState(mode === 'mock' ? MOCK_EMAIL : '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'mock') {
      const emailError = validateEmail(email);
      const passwordError = validateMockPassword(password);
      if (emailError || passwordError) {
        setError(emailError || passwordError);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="mark" aria-hidden="true">IN</div>
          <div>
            <h1>INTOTO</h1>
            <p>External Ambassador</p>
          </div>
        </div>
        <h2>Sign in</h2>
        {mode === 'mock' ? (
          <p className="banner">
            Mock sign-in. Use {MOCK_EMAIL} and password ambassador. This does not call Auth0.
          </p>
        ) : (
          <p className="muted">
            Sign-in opens the INTOTO Auth0 window. Universal Login cannot run inside an iframe, so the popup stays on the Auth0 origin.
          </p>
        )}
        {mode === 'mock' ? (
          <>
            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </>
        ) : null}
        {error ? (
          <p className="banner error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : mode === 'mock' ? 'Sign in' : 'Continue with INTOTO'}
        </button>
      </form>
    </div>
  );
}
