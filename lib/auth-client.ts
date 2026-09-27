'use client';

import { useCallback, useEffect, useState } from 'react';

export type ClientSession = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
  session: { id: string; expiresAt: string };
};

const SESSION_CACHE_KEY = 'team401-scouting-session-cache';

function cachedSession() {
  try {
    const value = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as ClientSession;
    if (new Date(session.session.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

async function loadSession() {
  try {
    const response = await fetch('/api/auth/firebase-session', {
      cache: 'no-store',
    });
    if (!response.ok) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    const session = (await response.json()) as ClientSession | null;
    if (session)
      window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_CACHE_KEY);
    return session;
  } catch {
    return cachedSession();
  }
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
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    await fetch('/api/auth/firebase-session', { method: 'DELETE' }).catch(
      () => undefined,
    );
  },
};
