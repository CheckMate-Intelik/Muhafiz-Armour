'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { setSession } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.loginAdmin(username, password);
      setSession({ token: res.token, role: 'ADMIN' });
      router.replace('/admin');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="h1">Admin Login</h1>
        <form onSubmit={onSubmit} className="stack">
          <label className="label">
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="label">
            Password
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}
          <button className="button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <div className="muted">Default credentials are controlled by `ADMIN_USERNAME` and `ADMIN_PASSWORD`.</div>
        </form>
      </div>
    </div>
  );
}

