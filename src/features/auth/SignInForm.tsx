'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NoticeBox } from '@/components/common/NoticeBox';

type AuthMode = 'signin' | 'signup' | 'magic' | 'forgot';

function safeNextPath(raw: string | null): string {
  if (
    !raw ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.startsWith('/\\') ||
    raw.includes('\\')
  ) {
    return '/community';
  }
  return raw;
}

function initialAuthErrorMessage(code: string | null): string {
  if (!code) return '';
  if (code === 'suspended') {
    return 'This account has been suspended. Contact support for help.';
  }
  if (code === 'forbidden') {
    return 'Staff permission is required for that workspace. Sign in with an authorized account.';
  }
  return 'Sign-in link expired or invalid. Try again.';
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const urlErr = searchParams.get('error');

  const [mode, setMode] = useState<AuthMode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => initialAuthErrorMessage(urlErr));
  const [statusMsg, setStatusMsg] = useState('');

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return (
      <NoticeBox
        title="Sign-in is not configured yet"
        body="Connect NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment to enable accounts and portals."
      >
        <Link className="btn btn-secondary" href="/">
          Back to home
        </Link>
      </NoticeBox>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    setStatusMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      const origin = window.location.origin;

      if (mode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (err) throw err;
        setStatusMsg('Check your email for a one-click sign-in link.');
        return;
      }

      if (mode === 'forgot') {
        const res = await fetch('/api/auth/recover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: trimmedEmail }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; fallbackClient?: boolean };
        if (json.fallbackClient) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
            redirectTo: `${origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
          });
          if (resetErr) throw resetErr;
        } else if (!res.ok) {
          throw new Error(json.error || 'Could not send recovery email.');
        }
        setStatusMsg(
          'If an account matches that address, we’ve sent instructions to reset your password.'
        );
        return;
      }

      if (password.length < 8) {
        setError('Enter a password of at least 8 characters.');
        return;
      }

      if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Enter your full name.');
          return;
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });
        if (signUpErr) throw signUpErr;
        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setStatusMsg('Account created. Check your email to confirm and finish signing in.');
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInErr) throw signInErr;
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setError('');
    setBusy(true);
    try {
      const origin = window.location.origin;
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (err) throw err;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Google sign-in could not start.');
    }
  }

  return (
    <div className="form-shell">
      <div>
        <div className="tabs" role="tablist" aria-label="Sign-in options">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => {
              setMode('signin');
              setError('');
              setStatusMsg('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => {
              setMode('signup');
              setError('');
              setStatusMsg('');
            }}
          >
            Create account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'magic'}
            onClick={() => {
              setMode('magic');
              setError('');
              setStatusMsg('');
            }}
          >
            Email link
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <strong>{error}</strong>
            </div>
          )}
          {statusMsg && (
            <div className="alert alert-ok" style={{ marginBottom: 20 }}>
              <strong>{statusMsg}</strong>
            </div>
          )}

          <div className="form-grid">
            {mode === 'signup' && (
              <div className="field full">
                <label htmlFor="auth_name">Full name</label>
                <input
                  id="auth_name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="field full">
              <label htmlFor="auth_email">Email address</label>
              <input
                id="auth_email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {(mode === 'signin' || mode === 'signup') && (
              <div className="field full">
                <label htmlFor="auth_pw">Password</label>
                <input
                  id="auth_pw"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === 'signin' && (
                  <p style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="btn-quiet small"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                        setStatusMsg('');
                      }}
                    >
                      Forgot password?
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy
                ? 'Working…'
                : mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'magic'
                      ? 'Send sign-in link'
                      : 'Send reset link'}
            </button>
            {mode === 'forgot' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMode('signin')}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>

        <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Or continue with your Google account
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={handleGoogle}
          >
            Continue with Google
          </button>
        </div>
      </div>

      <aside className="form-aside">
        <div className="callout">
          <h3>One account across portals</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Your Collabify account connects your Community membership, Affiliate partner dashboard,
            and White-label agency workspace.
          </p>
          <p className="small muted" style={{ marginTop: 12 }}>
            Protected under our <Link className="tlink" href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </aside>
    </div>
  );
}

