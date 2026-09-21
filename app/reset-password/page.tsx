'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const errorCode = params.get('error');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    errorCode ? 'This reset link is invalid or expired.' : '',
  );
  const [complete, setComplete] = useState(false);

  async function submit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newPassword: password, token }),
    });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    setBusy(false);
    if (!response.ok) {
      setMessage(body?.message ?? 'This reset link is invalid or expired.');
      return;
    }
    setComplete(true);
    setMessage('Password updated. Other signed-in devices have been revoked.');
  }

  return (
    <main className="auth-shell">
      <Link href="/sign-in" className="back-link">
        <ArrowLeft /> Back to sign in
      </Link>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {complete ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button
                nativeButton={false}
                className="w-full"
                render={<Link href="/sign-in" />}
              >
                Sign in
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="input-with-icon">
                  <LockKeyhole />
                  <Input
                    id="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>
              {message && (
                <p role="alert" className="auth-error">
                  {message}
                </p>
              )}
              <Button
                className="w-full"
                type="submit"
                disabled={busy || !token}
              >
                {busy && <LoaderCircle className="animate-spin" />}Update
                password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
