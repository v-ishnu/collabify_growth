'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NoticeBox } from '@/components/common/NoticeBox';

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!supabase) {
    return (
      <NoticeBox
        title="Password reset unavailable"
        body="Supabase authentication is not configured in this environment."
      />
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => {
        router.push('/community');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="alert alert-ok" style={{ maxWidth: 620 }}>
        <strong>Password updated.</strong> Taking you back to Collabify…{' '}
        <Link className="tlink" href="/community">
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="form-shell">
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <strong>{error}</strong>
          </div>
        )}
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="rp_pw">New password</label>
            <input
              id="rp_pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field full">
            <label htmlFor="rp_pw2">Confirm new password</label>
            <input
              id="rp_pw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}

