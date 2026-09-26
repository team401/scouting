import { getSessionFromHeaders } from '@/lib/scouting-session';

// Compatibility facade for existing route handlers. Firebase authenticates
// the Ops account; this reads the corresponding scouting application session.
export const auth = {
  api: {
    getSession: ({ headers }: { headers: Headers }) =>
      getSessionFromHeaders(headers),
  },
};
