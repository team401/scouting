import { getSessionFromHeaders } from '@/lib/scouting-session';

// Shared route-handler accessor for the scouting session created from Ops authentication.
export const auth = {
  api: {
    getSession: ({ headers }: { headers: Headers }) =>
      getSessionFromHeaders(headers),
  },
};
