import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';

const provider = 'tba-team-photo-v2';
const freshForMs = 24 * 60 * 60 * 1000;
const missingForMs = 6 * 60 * 60 * 1000;
const lockForMs = 30 * 1000;
const maxBytes = 10 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const mediaTypes = new Set(['cdphotothread', 'imgur', 'smugmug-photo']);
const mediaTypePriority = new Map([
  ['smugmug-photo', 0],
  ['imgur', 1],
  ['cdphotothread', 2],
]);

type CachePayload = {
  objectKey?: string;
  contentType?: string;
  sourceUrl?: string;
  missing?: boolean;
};

type CacheRow = {
  payload: string | null;
  etag: string | null;
  fetchedAt: number;
  refreshingUntil: number;
};

type TbaMedia = {
  type?: string;
  direct_url?: string;
  preferred?: boolean;
};

function parsePayload(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as CachePayload;
  } catch {
    return {};
  }
}

function extensionFor(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

async function cachedResponse(payload: CachePayload) {
  if (!payload.objectKey) return null;
  const object = await env.FILES.get(payload.objectKey);
  if (!object) return null;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, max-age=86400');
  return new Response(object.body, { headers });
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const teamNumber = Number(new URL(request.url).searchParams.get('team'));
  if (!Number.isInteger(teamNumber) || teamNumber <= 0)
    return new Response('Invalid team', { status: 400 });

  const event = await env.DB.prepare(
    `SELECT events.id, events.season_year AS seasonYear
     FROM memberships
     JOIN events ON events.organization_id = memberships.organization_id
     JOIN event_teams ON event_teams.organization_id = events.organization_id
       AND event_teams.event_id = events.id
     WHERE memberships.user_id = ? AND memberships.disabled = 0
       AND events.is_current = 1 AND event_teams.team_number = ?
     LIMIT 1`,
  )
    .bind(session.user.id, teamNumber)
    .first<{ id: string; seasonYear: number }>();
  if (!event) return new Response('Team not found', { status: 404 });

  const cacheKey = `${event.seasonYear}:frc${teamNumber}`;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO external_api_cache
     (provider, cache_key, payload, etag, fetched_at, refreshing_until)
     VALUES (?, ?, NULL, NULL, 0, 0)`,
  )
    .bind(provider, cacheKey)
    .run();
  const row = await env.DB.prepare(
    `SELECT payload, etag, fetched_at AS fetchedAt,
       refreshing_until AS refreshingUntil
     FROM external_api_cache WHERE provider = ? AND cache_key = ?`,
  )
    .bind(provider, cacheKey)
    .first<CacheRow>();
  if (!row) return new Response('Photo cache unavailable', { status: 503 });

  let payload = parsePayload(row.payload);
  const now = Date.now();
  const validFor = payload.missing ? missingForMs : freshForMs;
  if (row.fetchedAt > now - validFor) {
    if (payload.missing) return new Response('Not found', { status: 404 });
    const response = await cachedResponse(payload);
    if (response) return response;
  }
  if (!env.TBA_AUTH_KEY)
    return new Response('TBA is not configured', { status: 503 });

  const lock = await env.DB.prepare(
    `UPDATE external_api_cache SET refreshing_until = ?
     WHERE provider = ? AND cache_key = ? AND refreshing_until <= ?`,
  )
    .bind(now + lockForMs, provider, cacheKey, now)
    .run();
  if (!lock.meta.changes) {
    const stale = await cachedResponse(payload);
    if (stale) return stale;
    return new Response('Photo is being cached', {
      status: 503,
      headers: { 'retry-after': '2' },
    });
  }

  try {
    const headers = new Headers({ 'X-TBA-Auth-Key': env.TBA_AUTH_KEY });
    if (row.etag) headers.set('if-none-match', row.etag);
    const mediaResponse = await fetch(
      `https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/media/${event.seasonYear}`,
      { headers },
    );

    if (mediaResponse.status === 304) {
      await env.DB.prepare(
        `UPDATE external_api_cache SET fetched_at = ?, refreshing_until = 0
         WHERE provider = ? AND cache_key = ?`,
      )
        .bind(now, provider, cacheKey)
        .run();
      const response = await cachedResponse(payload);
      if (response) return response;
      if (payload.missing) return new Response('Not found', { status: 404 });
    }
    if (!mediaResponse.ok)
      throw new Error(`TBA media request failed (${mediaResponse.status})`);

    const media = (await mediaResponse.json()) as TbaMedia[];
    const candidates = media
      .filter(
        (item) =>
          item.type &&
          mediaTypes.has(item.type) &&
          item.direct_url?.startsWith('https://'),
      )
      .sort(
        (a, b) =>
          (mediaTypePriority.get(a.type!) ?? 99) -
            (mediaTypePriority.get(b.type!) ?? 99) ||
          Number(Boolean(b.preferred)) - Number(Boolean(a.preferred)),
      );

    let selected:
      | { bytes: ArrayBuffer; contentType: string; sourceUrl: string }
      | undefined;
    for (const candidate of candidates) {
      try {
        const imageResponse = await fetch(candidate.direct_url!);
        const contentType =
          imageResponse.headers.get('content-type')?.split(';')[0] ?? '';
        const contentLength = Number(
          imageResponse.headers.get('content-length') ?? 0,
        );
        if (
          !imageResponse.ok ||
          !imageTypes.has(contentType) ||
          contentLength > maxBytes
        )
          continue;
        const bytes = await imageResponse.arrayBuffer();
        if (bytes.byteLength > maxBytes) continue;
        selected = {
          bytes,
          contentType,
          sourceUrl: candidate.direct_url!,
        };
        break;
      } catch {
        // Try the next TBA image when a third-party host is unavailable.
      }
    }

    if (!selected) {
      payload = { missing: true };
      await env.DB.prepare(
        `UPDATE external_api_cache
         SET payload = ?, etag = ?, fetched_at = ?, refreshing_until = 0
         WHERE provider = ? AND cache_key = ?`,
      )
        .bind(
          JSON.stringify(payload),
          mediaResponse.headers.get('etag'),
          now,
          provider,
          cacheKey,
        )
        .run();
      return new Response('Not found', { status: 404 });
    }

    const objectKey = `tba/team-photos/${event.seasonYear}/frc${teamNumber}.${extensionFor(selected.contentType)}`;
    await env.FILES.put(objectKey, selected.bytes, {
      httpMetadata: {
        contentType: selected.contentType,
        cacheControl: 'private, max-age=86400',
      },
      customMetadata: {
        source: 'the-blue-alliance',
        sourceUrl: selected.sourceUrl,
        teamNumber: String(teamNumber),
        seasonYear: String(event.seasonYear),
      },
    });
    payload = {
      objectKey,
      contentType: selected.contentType,
      sourceUrl: selected.sourceUrl,
    };
    await env.DB.prepare(
      `UPDATE external_api_cache
       SET payload = ?, etag = ?, fetched_at = ?, refreshing_until = 0
       WHERE provider = ? AND cache_key = ?`,
    )
      .bind(
        JSON.stringify(payload),
        mediaResponse.headers.get('etag'),
        now,
        provider,
        cacheKey,
      )
      .run();
    return (
      (await cachedResponse(payload)) ??
      new Response('Not found', { status: 404 })
    );
  } catch (error) {
    await env.DB.prepare(
      `UPDATE external_api_cache SET refreshing_until = 0
       WHERE provider = ? AND cache_key = ?`,
    )
      .bind(provider, cacheKey)
      .run();
    const stale = await cachedResponse(payload);
    if (stale) return stale;
    console.error('Could not cache TBA team photo', error);
    return new Response('Could not load robot photo', { status: 502 });
  }
}
