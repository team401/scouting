'use client';

import { useCallback, useEffect, useState } from 'react';

export type ClientSession = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: { id: string };
};

async function loadSession() {
  const response = await fetch('/api/auth/firebase-session', {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return (await response.json()) as ClientSession | null;
}

function useSession() {
  const [data, setData] = useState<ClientSession | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refetch = useCallback(async () => {
    try {
      setData(await loadSession());
      setError(null);
    } catch (reason) {
      setData(null);
      setError(
        reason instanceof Error ? reason : new Error('Session unavailable.'),
      );
    } finally {
      setIsPending(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void refetch(), 0);
    return () => window.clearTimeout(timer);
  }, [refetch]);
  return { data, isPending, error, refetch };
}

export async function signInWithOps(email: string, password: string) {
  const response = await fetch('/api/auth/firebase-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return {
    error: response.ok
      ? null
      : { message: body?.error ?? 'Unable to sign in.' },
  };
}

export const authClient = {
  useSession,
  signOut: async () => {
    await fetch('/api/auth/firebase-session', { method: 'DELETE' });
  },
};
