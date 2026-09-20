import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const querySchema = z.coerce.number().int().min(1992).max(2100);
type TbaEvent = {
  key: string;
  name: string;
  start_date: string | null;
  city: string | null;
  state_prov: string | null;
  country: string | null;
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to choose an event.' },
      { status: 401 },
    );
  const membership =
    await env.DB.prepare(`SELECT memberships.role, organizations.frc_team_number AS teamNumber
    FROM memberships JOIN organizations ON organizations.id = memberships.organization_id WHERE memberships.user_id = ? LIMIT 1`)
      .bind(session.user.id)
      .first<{ role: string; teamNumber: number | null }>();
  if (!membership || !['owner', 'admin'].includes(membership.role))
    return Response.json(
      { error: 'Only an owner or admin can choose the current event.' },
      { status: 403 },
    );
  if (!env.TBA_AUTH_KEY)
    return Response.json(
      { error: 'The TBA API key has not been configured on this Worker.' },
      { status: 503 },
    );
  const parsedYear = querySchema.safeParse(
    new URL(request.url).searchParams.get('year') ?? '2026',
  );
  if (!parsedYear.success)
    return Response.json(
      { error: 'Choose a valid FRC season.' },
      { status: 400 },
    );
  const teamNumber = membership.teamNumber ?? 401;
  const response = await fetch(
    `https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/events/${parsedYear.data}/simple`,
    {
      headers: {
        'X-TBA-Auth-Key': env.TBA_AUTH_KEY,
        'User-Agent': 'Team401-Scouting/1.0',
      },
    },
  );
  if (!response.ok)
    return Response.json(
      {
        error: `TBA could not load Team ${teamNumber}'s events (${response.status}).`,
      },
      { status: 502 },
    );
  const events = (await response.json()) as TbaEvent[];
  return Response.json({
    teamNumber,
    year: parsedYear.data,
    events: events
      .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
      .map((event) => ({
        key: event.key,
        name: event.name,
        date: event.start_date,
        location: [event.city, event.state_prov, event.country]
          .filter(Boolean)
          .join(', '),
      })),
  });
}
