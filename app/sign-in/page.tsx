'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const result = mode === 'signup'
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (result.error) setError(result.error.message || 'Unable to continue.');
    else window.location.href = '/';
  }

  return <main className="auth-shell"><a href="/" className="back-link"><ArrowLeft /> Back to scouting</a><Card className="auth-card"><CardHeader><div className="brand-lockup"><span className="brand-mark">401</span></div><CardTitle>{mode === 'signup' ? 'Create your scout account' : 'Welcome back'}</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}>{mode === 'signup' && <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><div className="input-with-icon"><Mail /><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="scout@example.com" /></div></div><div className="space-y-2"><Label htmlFor="password">Password</Label><div className="input-with-icon"><LockKeyhole /><Input id="password" type="password" minLength={10} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 10 characters" /></div></div>{error && <p role="alert" className="auth-error">{error}</p>}<Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{mode === 'signup' ? 'Create account' : 'Sign in'}</Button></form><div className="auth-switch"><span>{mode === 'signup' ? 'Already have an account?' : 'New to Team 401 scouting?'}</span><button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}>{mode === 'signup' ? 'Sign in' : 'Create account'}</button></div></CardContent></Card></main>;
}
