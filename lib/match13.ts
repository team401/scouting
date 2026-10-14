const MATCH13_REFRESH_MS = 5 * 60 * 1000;
const MATCH13_LEASE_MS = 30 * 1000;

export type Match13EventTeams = {
  eventKey?: string;
  teams?: Array<{
    teamNumber?: number;
    xpEnd?: number | null;
    xpMean?: number | null;
  }>;
};

type CacheRow = {
  payload: string | null;
  etag: string | null;
  fetchedAt: number;
  refreshingUntil: number;
};

function parseCachedPayload(payload: string | null) {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as Match13EventTeams;
  } catch {
    return null;
  }
}

export async function getMatch13EventTeams(
  db: D1Database,
  eventKey: string,
  apiKey?: string,
) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT OR IGNORE INTO external_api_cache
       (provider, cache_key, payload, etag, fetched_at, refreshing_until)
       VALUES ('match13', ?, NULL, NULL, 0, 0)`,
    )
    .bind(eventKey)
    .run();
  let cached = await db
    .prepare(
      `SELECT payload, etag, fetched_at AS fetchedAt,
       refreshing_until AS refreshingUntil
       FROM external_api_cache
       WHERE provider = 'match13' AND cache_key = ?`,
    )
    .bind(eventKey)
    .first<CacheRow>();
  const staleValue = parseCachedPayload(cached?.payload ?? null);
  if (cached?.payload && now - cached.fetchedAt < MATCH13_REFRESH_MS)
    return staleValue;
  if (!apiKey) return staleValue;

  const lease = await db
    .prepare(
      `UPDATE external_api_cache SET refreshing_until = ?
       WHERE provider = 'match13' AND cache_key = ?
       AND refreshing_until <= ? AND fetched_at <= ?`,
    )
    .bind(now + MATCH13_LEASE_MS, eventKey, now, now - MATCH13_REFRESH_MS)
    .run();
  if (lease.meta.changes !== 1) return staleValue;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'Team401-Scouting/1.0',
    };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    const response = await fetch(
      `https://actions.match13.com/v1/events/${encodeURIComponent(eventKey)}/teams`,
      { headers },
    );
    if (response.status === 304 && cached?.payload) {
      await db
        .prepare(
          `UPDATE external_api_cache SET fetched_at = ?, refreshing_until = 0
           WHERE provider = 'match13' AND cache_key = ?`,
        )
        .bind(now, eventKey)
        .run();
      return staleValue;
    }
    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const backoffMs =
        response.status === 429 && Number.isFinite(retryAfter)
          ? Math.max(60_000, retryAfter * 1000)
          : 60_000;
      await db
        .prepare(
          `UPDATE external_api_cache SET refreshing_until = ?
           WHERE provider = 'match13' AND cache_key = ?`,
        )
        .bind(now + backoffMs, eventKey)
        .run();
      return staleValue;
    }
    const data = (await response.json()) as Match13EventTeams;
    if (!Array.isArray(data.teams))
      throw new Error('Invalid Match13 response.');
    await db
      .prepare(
        `UPDATE external_api_cache
         SET payload = ?, etag = ?, fetched_at = ?, refreshing_until = 0
         WHERE provider = 'match13' AND cache_key = ?`,
      )
      .bind(JSON.stringify(data), response.headers.get('ETag'), now, eventKey)
      .run();
    return data;
  } catch {
    cached = await db
      .prepare(
        `SELECT payload, etag, fetched_at AS fetchedAt,
         refreshing_until AS refreshingUntil
         FROM external_api_cache
         WHERE provider = 'match13' AND cache_key = ?`,
      )
      .bind(eventKey)
      .first<CacheRow>();
    await db
      .prepare(
        `UPDATE external_api_cache SET refreshing_until = ?
         WHERE provider = 'match13' AND cache_key = ?`,
      )
      .bind(now + 60_000, eventKey)
      .run();
    return parseCachedPayload(cached?.payload ?? null);
  }
}
