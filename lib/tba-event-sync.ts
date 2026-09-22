import { env } from 'cloudflare:workers';

type TbaEvent = { key: string; name: string; year: number };
type TbaAlliance = { team_keys: string[]; score: number };
type TbaMatch = {
  key: string;
  comp_level: string;
  match_number: number;
  set_number: number;
  time: number | null;
  predicted_time: number | null;
  alliances: { red: TbaAlliance; blue: TbaAlliance };
  winning_alliance: string;
  actual_time: number | null;
  score_breakdown: unknown;
  videos: Array<{ type: string; key: string }>;
};

export async function syncTbaEvent(organizationId: string, eventKey: string) {
  if (!env.TBA_AUTH_KEY)
    throw new Error('The TBA API key has not been configured.');
  const headers = {
    'X-TBA-Auth-Key': env.TBA_AUTH_KEY,
    'User-Agent': 'Team401-Scouting/1.0',
  };
  const base = `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}`;
  const [eventResponse, matchesResponse] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/matches`, { headers }),
  ]);
  if (!eventResponse.ok || !matchesResponse.ok)
    throw new Error(
      `TBA refresh failed (${eventResponse.status}/${matchesResponse.status}).`,
    );

  const event = (await eventResponse.json()) as TbaEvent;
  const matches = (await matchesResponse.json()) as TbaMatch[];
  const eventId = `${organizationId}:${event.key}`;
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO seasons (year, game_key, schema_version, field_definition, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(year) DO UPDATE SET updated_at = excluded.updated_at',
    ).bind(
      event.year,
      `${event.year}-rebuilt`,
      JSON.stringify({ year: event.year, version: 1 }),
      now,
      now,
    ),
    env.DB.prepare(
      'UPDATE events SET is_current = 0 WHERE organization_id = ? AND tba_event_key <> ?',
    ).bind(organizationId, event.key),
    env.DB.prepare(`INSERT INTO events (id, organization_id, season_year, tba_event_key, name, is_current, tba_etag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?) ON CONFLICT(organization_id, tba_event_key) DO UPDATE SET name = excluded.name,
      is_current = 1, tba_etag = excluded.tba_etag, updated_at = excluded.updated_at`).bind(
      eventId,
      organizationId,
      event.year,
      event.key,
      event.name,
      matchesResponse.headers.get('etag'),
      now,
      now,
    ),
    ...matches.map((match) =>
      env.DB.prepare(`INSERT INTO matches
        (id, organization_id, event_id, tba_match_key, comp_level, match_number, scheduled_at, predicted_at, alliances, result, videos, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(organization_id, tba_match_key) DO UPDATE SET
        comp_level = excluded.comp_level, match_number = excluded.match_number, scheduled_at = excluded.scheduled_at,
        predicted_at = excluded.predicted_at, alliances = excluded.alliances, result = excluded.result,
        videos = excluded.videos, updated_at = excluded.updated_at`).bind(
        `${organizationId}:${match.key}`,
        organizationId,
        eventId,
        match.key,
        match.comp_level,
        match.match_number,
        match.time ? match.time * 1000 : null,
        match.predicted_time ? match.predicted_time * 1000 : null,
        JSON.stringify(match.alliances),
        JSON.stringify({
          winningAlliance: match.winning_alliance || null,
          actualTime: match.actual_time ? match.actual_time * 1000 : null,
          redScore:
            match.alliances.red.score >= 0 ? match.alliances.red.score : null,
          blueScore:
            match.alliances.blue.score >= 0 ? match.alliances.blue.score : null,
          scoreBreakdown: match.score_breakdown,
        }),
        JSON.stringify(match.videos ?? []),
        now,
        now,
      ),
    ),
  ]);
  return { event, matchCount: matches.length, refreshedAt: now };
}
