'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { ArrowLeft, LoaderCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(
    event: Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0],
  ) {
    event.preventDefault();
    setBusy(true);
    await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, redirectTo: '/reset-password' }),
    }).catch(() => undefined);
    setBusy(false);
    setMessage('If that address has an account, a reset link has been sent.');
  }

  return (
    <main className="auth-shell">
      <Link href="/sign-in" className="back-link">
        <ArrowLeft /> Back to sign in
      </Link>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <p className="text-sm text-muted-foreground">
              Enter your account email. For privacy, the response is the same
              whether the account exists or not.
            </p>
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
                />
              </div>
            </div>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy && <LoaderCircle className="animate-spin" />}Send reset link
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
