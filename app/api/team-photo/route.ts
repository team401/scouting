import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';

const provider = 'tba-team-photo-v3';
const freshForMs = 7 * 24 * 60 * 60 * 1000;
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
  images?: Array<{
    objectKey: string;
    contentType: string;
    sourceUrl: string;
  }>;
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
  foreign_key?: string;
  preferred?: boolean;
};

function detectedImageType(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes);
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return 'image/jpeg';
  if (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  )
    return 'image/png';
  if (
    String.fromCharCode(...data.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

function candidateUrls(item: TbaMedia) {
  const urls = new Set<string>();
  if (item.direct_url?.startsWith('https://')) urls.add(item.direct_url);
  // Some TBA Imgur records point at the gallery page or omit an extension.
  // The image CDN URL is more reliable from Workers and avoids fetching HTML.
  if (item.type === 'imgur' && item.foreign_key) {
    urls.add(`https://i.imgur.com/${item.foreign_key}.jpg`);
    urls.add(`https://i.imgur.com/${item.foreign_key}.png`);
  }
  return [...urls];
}

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

async function cachedResponse(payload: CachePayload, index: number) {
  const image = payload.images?.[index];
  if (!image) return null;
  const object = await env.FILES.get(image.objectKey);
  if (!object) return null;
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set(
    'cache-control',
    'private, max-age=604800, stale-while-revalidate=2592000',
  );
  return new Response(object.body, { headers });
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const teamNumber = Number(url.searchParams.get('team'));
  const imageIndex = Math.max(0, Number(url.searchParams.get('index')) || 0);
  const metadataOnly = url.searchParams.get('meta') === '1';
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
    if (metadataOnly)
      return Response.json({ count: payload.images?.length ?? 0 });
    const response = await cachedResponse(payload, imageIndex);
    if (response) return response;
    if (payload.images?.length)
      return new Response('Photo not found', { status: 404 });
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
    if (metadataOnly && payload.images?.length)
      return Response.json({ count: payload.images.length });
    const stale = await cachedResponse(payload, imageIndex);
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
      if (metadataOnly)
        return Response.json({ count: payload.images?.length ?? 0 });
      const response = await cachedResponse(payload, imageIndex);
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
          candidateUrls(item).length > 0,
      )
      .sort(
        (a, b) =>
          (mediaTypePriority.get(a.type!) ?? 99) -
            (mediaTypePriority.get(b.type!) ?? 99) ||
          Number(Boolean(b.preferred)) - Number(Boolean(a.preferred)),
      );

    const selected: Array<{
      bytes: ArrayBuffer;
      contentType: string;
      sourceUrl: string;
    }> = [];
    for (const candidate of candidates.slice(0, 12)) {
      for (const sourceUrl of candidateUrls(candidate)) {
        try {
          const imageResponse = await fetch(sourceUrl, {
            headers: {
              accept: 'image/avif,image/webp,image/png,image/jpeg,image/*',
              'user-agent': 'Team401-Scouting/1.0',
            },
            redirect: 'follow',
          });
          const declaredType =
            imageResponse.headers.get('content-type')?.split(';')[0] ?? '';
          const contentLength = Number(
            imageResponse.headers.get('content-length') ?? 0,
          );
          if (!imageResponse.ok || contentLength > maxBytes) continue;
          const bytes = await imageResponse.arrayBuffer();
          if (bytes.byteLength > maxBytes) continue;
          const contentType = imageTypes.has(declaredType)
            ? declaredType
            : detectedImageType(bytes);
          if (!contentType) continue;
          selected.push({ bytes, contentType, sourceUrl });
          break;
        } catch {
          // Try alternate URLs and then the next TBA image.
        }
      }
    }

    if (!selected.length) {
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

    const images: NonNullable<CachePayload['images']> = [];
    for (const [index, image] of selected.entries()) {
      const objectKey = `tba/team-photos/${event.seasonYear}/frc${teamNumber}-${index}.${extensionFor(image.contentType)}`;
      await env.FILES.put(objectKey, image.bytes, {
        httpMetadata: {
          contentType: image.contentType,
          cacheControl:
            'private, max-age=604800, stale-while-revalidate=2592000',
        },
        customMetadata: {
          source: 'the-blue-alliance',
          sourceUrl: image.sourceUrl,
          teamNumber: String(teamNumber),
          seasonYear: String(event.seasonYear),
        },
      });
      images.push({
        objectKey,
        contentType: image.contentType,
        sourceUrl: image.sourceUrl,
      });
    }
    payload = {
      images,
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
    if (metadataOnly) return Response.json({ count: images.length });
    return (
      (await cachedResponse(payload, imageIndex)) ??
      new Response('Not found', { status: 404 })
    );
  } catch (error) {
    await env.DB.prepare(
      `UPDATE external_api_cache SET refreshing_until = 0
       WHERE provider = ? AND cache_key = ?`,
    )
      .bind(provider, cacheKey)
      .run();
    if (metadataOnly && payload.images?.length)
      return Response.json({ count: payload.images.length });
    const stale = await cachedResponse(payload, imageIndex);
    if (stale) return stale;
    console.error('Could not cache TBA team photo', error);
    return new Response('Could not load robot photo', { status: 502 });
  }
}
