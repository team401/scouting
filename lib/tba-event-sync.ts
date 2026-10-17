import { env } from 'cloudflare:workers';
import {
  normalizeQualificationSchedule,
  type FrcScheduleResponse,
} from '@/lib/frc-events';
import { reconcileShiftAssignments } from '@/lib/scout-shifts';

type TbaEvent = {
  key: string;
  name: string;
  year: number;
  timezone: string | null;
  start_date: string | null;
  end_date: string | null;
  event_type: number | null;
  first_event_code?: string | null;
};
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
type TbaTeam = {
  team_number: number;
  nickname: string | null;
  name: string;
};

const championshipEventTypes = new Set([2, 3, 4, 5]);

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function defaultScheduleDays(event: TbaEvent) {
  if (!event.start_date || !event.end_date) return [];
  const days: Array<{ date: string; startHour: number; endHour: number }> = [];
  if (event.event_type !== null && championshipEventTypes.has(event.event_type))
    days.push({
      date: shiftDate(event.start_date, -1),
      startHour: 15,
      endHour: 21,
    });
  for (
    let date = event.start_date;
    date <= event.end_date;
    date = shiftDate(date, 1)
  )
    days.push({ date, startHour: 7, endHour: 19 });
  return days;
}

export async function syncTbaEvent(organizationId: string, eventKey: string) {
  if (!env.TBA_AUTH_KEY)
    throw new Error('The TBA API key has not been configured.');
  const headers = {
    'X-TBA-Auth-Key': env.TBA_AUTH_KEY,
    'User-Agent': 'Team401-Scouting/1.0',
  };
  const base = `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(eventKey)}`;
  const [eventResponse, matchesResponse, teamsResponse] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/matches`, { headers }),
    fetch(`${base}/teams/simple`, { headers }),
  ]);
  if (!eventResponse.ok || !teamsResponse.ok)
    throw new Error(
      `TBA refresh failed (${eventResponse.status}/${matchesResponse.status}/${teamsResponse.status}).`,
    );

  const event = (await eventResponse.json()) as TbaEvent;
  const tbaMatches = matchesResponse.ok
    ? ((await matchesResponse.json()) as TbaMatch[])
    : [];
  const teams = (await teamsResponse.json()) as TbaTeam[];
  let frcMatches: TbaMatch[] = [];
  if (
    env.FRC_EVENTS_USERNAME &&
    env.FRC_EVENTS_AUTH_KEY &&
    event.first_event_code
  ) {
    try {
      const authorization = btoa(
        `${env.FRC_EVENTS_USERNAME}:${env.FRC_EVENTS_AUTH_KEY}`,
      );
      const scheduleResponse = await fetch(
        `https://frc-api.firstinspires.org/v3.0/${event.year}/schedule/${encodeURIComponent(event.first_event_code)}?tournamentLevel=qual`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${authorization}`,
            'User-Agent': 'Team401-Scouting/1.0',
          },
        },
      );
      if (scheduleResponse.ok)
        frcMatches = normalizeQualificationSchedule(
          event.key,
          event.timezone,
          (await scheduleResponse.json()) as FrcScheduleResponse,
        );
      else
        console.warn(
          JSON.stringify({
            level: 'warning',
            source: 'frc-events-refresh',
            message: 'FIRST qualification schedule request failed',
            eventKey,
            status: scheduleResponse.status,
          }),
        );
    } catch (error) {
      console.warn(
        JSON.stringify({
          level: 'warning',
          source: 'frc-events-refresh',
          message: 'FIRST qualification schedule refresh failed',
          eventKey,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
  if (!matchesResponse.ok && !frcMatches.length)
    throw new Error(`TBA match refresh failed (${matchesResponse.status}).`);
  const tbaKeys = new Set(tbaMatches.map((match) => match.key));
  const matches = [
    ...tbaMatches,
    ...frcMatches.filter((match) => !tbaKeys.has(match.key)),
  ];
  const eventId = `${organizationId}:${event.key}`;
  const now = Date.now();
  const scheduleDayCount = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM event_schedule_days WHERE event_id = ?',
  )
    .bind(eventId)
    .first<{ count: number }>();
  const scheduleDays = Number(scheduleDayCount?.count ?? 0)
    ? []
    : defaultScheduleDays(event);
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
    env.DB.prepare(`INSERT INTO events (id, organization_id, season_year, tba_event_key, name, is_current, tba_etag, timezone, start_date, end_date, event_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(organization_id, tba_event_key) DO UPDATE SET name = excluded.name,
      is_current = 1, tba_etag = excluded.tba_etag, timezone = excluded.timezone, start_date = excluded.start_date,
      end_date = excluded.end_date, event_type = excluded.event_type, updated_at = excluded.updated_at`).bind(
      eventId,
      organizationId,
      event.year,
      event.key,
      event.name,
      matchesResponse.headers.get('etag'),
      event.timezone,
      event.start_date,
      event.end_date,
      event.event_type,
      now,
      now,
    ),
    ...scheduleDays.map((day) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO event_schedule_days (event_id, date, start_hour, end_hour)
         VALUES (?, ?, ?, ?)`,
      ).bind(eventId, day.date, day.startHour, day.endHour),
    ),
    // The conflict update deliberately leaves name_override untouched. That
    // value belongs to this event-team row, so revisiting or refreshing an
    // event keeps its B-team mapping while another event may use a different
    // name for the same demo number.
    ...teams.map((team) =>
      env.DB.prepare(`INSERT INTO event_teams (organization_id, event_id, team_number, name, updated_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(organization_id, event_id, team_number) DO UPDATE SET
        name = excluded.name, updated_at = excluded.updated_at`).bind(
        organizationId,
        eventId,
        team.team_number,
        team.nickname?.trim() || team.name,
        now,
      ),
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
  await reconcileShiftAssignments(env.DB, organizationId, eventId);
  return { event, matchCount: matches.length, refreshedAt: now };
}
