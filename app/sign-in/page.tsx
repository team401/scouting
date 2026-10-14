'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { authClient, signInWithOps } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SignInPage() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guestCode, setGuestCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState('');

  useEffect(() => {
    if (!isPending && session) window.location.replace('/');
  }, [isPending, session]);

  async function submit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const result = await signInWithOps(email.trim().toLowerCase(), password);
    setBusy(false);
    if (result.mustResetPassword) setMustResetPassword(true);
    else if (result.error) setError(result.error.message);
    else window.location.replace('/');
  }

  async function setFirstPassword(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const response = await fetch('/api/auth/firebase-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        currentPassword: password,
        newPassword,
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      setBusy(false);
      setError(body?.error ?? 'Could not change your password.');
      return;
    }
    const result = await signInWithOps(email.trim().toLowerCase(), newPassword);
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
      body: JSON.stringify({ code: guestCode, name: guestName }),
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
      <ThemeToggle className="auth-theme-toggle" />
      <Link href="/" className="back-link">
        <ArrowLeft /> Back to scouting
      </Link>
      <Card className="auth-card">
        <CardHeader>
          <div className="brand-lockup">
            <span className="brand-mark">401</span>
          </div>
          <CardTitle>
            {mustResetPassword
              ? 'Choose your permanent password'
              : 'Sign in with Team 401 Ops'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={mustResetPassword ? setFirstPassword : submit}
          >
            {mustResetPassword && (
              <p className="text-sm text-muted-foreground">
                Replace the temporary password your coach gave you before using
                Scouting or Ops.
              </p>
            )}
            {!mustResetPassword && (
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
            )}
            {!mustResetPassword && (
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
            )}
            {mustResetPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="auth-error">
                {error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}
              {mustResetPassword ? 'Save and continue' : 'Sign in'}
            </Button>
          </form>
          {!mustResetPassword && (
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
          )}
        </CardContent>
      </Card>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Visiting scout</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={guestSubmit}>
            <p className="text-sm text-muted-foreground">
              Scouting with Team 401 temporarily? Enter your name and the
              shared code provided to your team.
            </p>
            <div className="space-y-2">
              <Label htmlFor="guest-name">Your name</Label>
              <Input
                id="guest-name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                placeholder="First and last name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-code">Team guest code</Label>
              <Input
                id="guest-code"
                autoComplete="off"
                spellCheck={false}
                required
                value={guestCode}
                onChange={(event) => setGuestCode(event.target.value)}
                placeholder="401-XXXX-XXXX"
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
