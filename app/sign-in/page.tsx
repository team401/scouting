'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { signInWithOps } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guestCode, setGuestCode] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState('');

  async function submit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = await signInWithOps(email.trim().toLowerCase(), password);
    setBusy(false);
    if (result.error) setError(result.error.message);
    else window.location.replace('/');
  }

  async function guestSubmit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setGuestBusy(true);
    setGuestError('');
    const response = await fetch('/api/auth/guest-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: guestCode }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setGuestBusy(false);
    if (!response.ok) {
      setGuestError(body?.error ?? 'Unable to use this guest pass.');
      return;
    }
    window.location.replace('/');
  }

  return (
    <main className="auth-shell">
      <Link href="/" className="back-link">
        <ArrowLeft /> Back to scouting
      </Link>
      <Card className="auth-card">
        <CardHeader>
          <div className="brand-lockup">
            <span className="brand-mark">401</span>
          </div>
          <CardTitle>Sign in with Team 401 Ops</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="input-with-icon">
                <Mail />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your Ops account email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="input-with-icon">
                <LockKeyhole />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />} Sign in
            </Button>
          </form>
          <div className="mt-3 space-y-2 text-center text-sm">
            <Link
              className="text-primary hover:underline"
              href="/forgot-password"
            >
              Forgot your Ops password?
            </Link>
            <p className="text-muted-foreground">
              Accounts are created and managed in Team 401 Ops.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Visiting scout</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={guestSubmit}>
            <p className="text-sm text-muted-foreground">
              Scouting with Team 401 temporarily? Enter the individual guest
              pass provided by a scouting administrator.
            </p>
            <div className="space-y-2">
              <Label htmlFor="guest-code">Guest pass</Label>
              <Input
                id="guest-code"
                autoComplete="off"
                spellCheck={false}
                required
                value={guestCode}
                onChange={(event) => setGuestCode(event.target.value)}
                placeholder="401-XXXX-XXXX-XXXX-XXXX"
              />
            </div>
            {guestError && (
              <p role="alert" className="auth-error">
                {guestError}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={guestBusy}>
              {guestBusy && <LoaderCircle className="animate-spin" />} Continue
              as guest
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
