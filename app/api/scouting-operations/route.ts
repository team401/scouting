import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { observedPoints, type ScoutingPayload } from '@/lib/scouting-metrics';
import { canReopenEntries } from '@/lib/scouting-policy';
import {
  isAllianceScoreOutlier,
  isTeamTrendOutlier,
} from '@/lib/scout-quality';

type MatchRow = {
  id: string;
  matchKey: string;
  matchNumber: number;
  compLevel: string;
  predictedAt: number | null;
  result: string | null;
  alliances: string;
  videos: string | null;
};

type AssignmentRow = {
  matchId: string;
  teamNumber: number;
  station: string;
  scoutUserId: string;
  scoutName: string;
};

type EntryRow = {
  id: string;
  matchId: string;
  matchKey: string;
  teamNumber: number;
  station: string;
  scoutUserId: string;
  scoutName: string;
  payload: string;
  submittedAt: number;
};

type ReviewCaseRow = {
  id: string;
  status: 'open' | 'assigned' | 'corrected' | 'valid' | 'dismissed';
  assignedReviewerId: string | null;
  reviewerName: string | null;
  reviewerNotes: string | null;
  resolvedAt: number | null;
};

const reviewUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'assigned', 'corrected', 'valid', 'dismissed']),
  reviewerNotes: z.string().max(2000).optional(),
  assignToMe: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to review scouting.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership || !canReopenEntries(membership.role))
    return Response.json(
      { error: 'Strategy, admin, or owner access is required.' },
      { status: 403 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(membership.organization_id)
    .first<{ id: string }>();
  if (!event)
    return Response.json({
      coverage: [],
      issues: [],
      audit: [],
      scoutQuality: [],
      summary: { assigned: 0, submitted: 0, missing: 0, issues: 0 },
    });

  const [matches, assignments, entries, audit] = await Promise.all([
    env.DB.prepare(
      `SELECT id, tba_match_key AS matchKey, match_number AS matchNumber, comp_level AS compLevel,
       predicted_at AS predictedAt, result, alliances, videos FROM matches
       WHERE organization_id = ? AND event_id = ? ORDER BY match_number`,
    )
      .bind(membership.organization_id, event.id)
      .all<MatchRow>(),
    env.DB.prepare(
      `SELECT scout_assignments.match_id AS matchId, scout_assignments.team_number AS teamNumber,
       scout_assignments.station, scout_assignments.scout_user_id AS scoutUserId, users.name AS scoutName
       FROM scout_assignments JOIN users ON users.id = scout_assignments.scout_user_id
       WHERE scout_assignments.organization_id = ? AND scout_assignments.event_id = ?`,
    )
      .bind(membership.organization_id, event.id)
      .all<AssignmentRow>(),
    env.DB.prepare(
      `SELECT scout_entries.id, scout_entries.match_id AS matchId, matches.tba_match_key AS matchKey,
       scout_entries.team_number AS teamNumber, scout_entries.station, scout_entries.scout_user_id AS scoutUserId,
       users.name AS scoutName, scout_entries.payload, scout_entries.updated_at AS submittedAt
       FROM scout_entries JOIN matches ON matches.id = scout_entries.match_id
       JOIN users ON users.id = scout_entries.scout_user_id
       WHERE scout_entries.organization_id = ? AND scout_entries.event_id = ?`,
    )
      .bind(membership.organization_id, event.id)
      .all<EntryRow>(),
    env.DB.prepare(
      `SELECT entry_audit.id, entry_audit.entry_id AS entryId, entry_audit.action,
       entry_audit.created_at AS createdAt, users.name AS actorName
       FROM entry_audit JOIN users ON users.id = entry_audit.actor_user_id
       WHERE entry_audit.organization_id = ? ORDER BY entry_audit.created_at DESC LIMIT 25`,
    )
      .bind(membership.organization_id)
      .all(),
  ]);

  const entryGroups = new Map<string, EntryRow[]>();
  for (const entry of entries.results) {
    const key = `${entry.matchId}:${entry.teamNumber}`;
    entryGroups.set(key, [...(entryGroups.get(key) ?? []), entry]);
  }
  const matchById = new Map(matches.results.map((match) => [match.id, match]));
  const coverage = assignments.results.map((assignment) => {
    const match = matchById.get(assignment.matchId);
    const matchingEntries =
      entryGroups.get(`${assignment.matchId}:${assignment.teamNumber}`) ?? [];
    const ownEntry = matchingEntries.find(
      (entry) => entry.scoutUserId === assignment.scoutUserId,
    );
    const actualTime = match?.result
      ? ((JSON.parse(match.result) as { actualTime?: number | null })
          .actualTime ?? null)
      : null;
    return {
      ...assignment,
      matchKey: match?.matchKey ?? '',
      matchNumber: match?.matchNumber ?? 0,
      compLevel: match?.compLevel ?? '',
      predictedAt: match?.predictedAt ?? null,
      completed: Boolean(match?.result && JSON.parse(match.result).actualTime),
      actualTime,
      status: ownEntry
        ? 'submitted'
        : matchingEntries.length
          ? 'covered'
          : 'missing',
      entryId: ownEntry?.id ?? matchingEntries[0]?.id ?? null,
      submittedAt:
        ownEntry?.submittedAt ?? matchingEntries[0]?.submittedAt ?? null,
    };
  });

  const pointsByTeam = new Map<number, number[]>();
  const parsedEntries = entries.results.map((entry) => {
    const payload = JSON.parse(entry.payload) as ScoutingPayload & {
      reopened?: boolean;
      reviewSource?: string;
    };
    const points = observedPoints(payload);
    pointsByTeam.set(entry.teamNumber, [
      ...(pointsByTeam.get(entry.teamNumber) ?? []),
      points,
    ]);
    return { entry, payload, points };
  });
  const allianceMismatch = new Set<string>();
  for (const match of matches.results) {
    if (!match.result) continue;
    const result = JSON.parse(match.result) as {
      redScore?: number | null;
      blueScore?: number | null;
    };
    for (const color of ['red', 'blue'] as const) {
      const allianceEntries = parsedEntries.filter(
        ({ entry }) =>
          entry.matchId === match.id && entry.station.startsWith(color),
      );
      const official = color === 'red' ? result.redScore : result.blueScore;
      if (official === null || official === undefined) continue;
      const reported = allianceEntries.reduce(
        (sum, item) => sum + item.points,
        0,
      );
      if (isAllianceScoreOutlier(reported, official, allianceEntries.length))
        allianceEntries.forEach(({ entry }) => allianceMismatch.add(entry.id));
    }
  }
  const issues = parsedEntries.flatMap(({ entry, payload, points }) => {
    const duplicateCount =
      entryGroups.get(`${entry.matchId}:${entry.teamNumber}`)?.length ?? 0;
    const flags = [
      duplicateCount > 1 ? `${duplicateCount} submissions for this robot` : '',
      !payload.noShow && observedPoints(payload) === 0
        ? 'zero observed output'
        : '',
      payload.disabled ? 'robot disabled' : '',
      payload.reopened ? 'entry reopened for correction' : '',
      allianceMismatch.has(entry.id)
        ? 'alliance reports differ substantially from TBA score'
        : '',
      isTeamTrendOutlier(points, pointsByTeam.get(entry.teamNumber) ?? [])
        ? 'far outside this team’s recent scoring trend'
        : '',
    ].filter(Boolean);
    return flags.length
      ? [
          {
            id: entry.id,
            matchKey: entry.matchKey,
            teamNumber: entry.teamNumber,
            scoutName: entry.scoutName,
            submittedAt: entry.submittedAt,
            points,
            activeFuel: payload.activeFuel,
            cycles: payload.cycles,
            flags,
            reopened: Boolean(payload.reopened),
            reviewSource: payload.reviewSource ?? null,
            matchId: entry.matchId,
            station: entry.station,
            videos: matchById.get(entry.matchId)?.videos
              ? JSON.parse(matchById.get(entry.matchId)!.videos!)
              : [],
          },
        ]
      : [];
  });
  const completedMissing = coverage.filter(
    (slot) => slot.completed && slot.status === 'missing',
  );
  const allIssues = [
    ...completedMissing.map((slot) => ({
      id: `missing:${slot.matchId}:${slot.station}`,
      matchKey: slot.matchKey,
      teamNumber: slot.teamNumber,
      scoutName: slot.scoutName,
      submittedAt: null,
      points: null,
      activeFuel: null,
      cycles: null,
      flags: ['missing submission for completed match'],
      reopened: false,
      reviewSource: null,
      matchId: slot.matchId,
      station: slot.station,
      videos: matchById.get(slot.matchId)?.videos
        ? JSON.parse(matchById.get(slot.matchId)!.videos!)
        : [],
    })),
    ...issues,
  ];
  const now = Date.now();
  if (allIssues.length) {
    const reviewStatements = allIssues.map((issue) =>
      env.DB.prepare(
        `INSERT INTO review_cases
           (id, organization_id, event_id, entry_id, match_id, team_number, station, kind, status, flags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           status = CASE WHEN review_cases.flags <> excluded.flags THEN 'open' ELSE review_cases.status END,
           resolved_by = CASE WHEN review_cases.flags <> excluded.flags THEN NULL ELSE review_cases.resolved_by END,
           resolved_at = CASE WHEN review_cases.flags <> excluded.flags THEN NULL ELSE review_cases.resolved_at END,
           flags = excluded.flags, updated_at = excluded.updated_at`,
      ).bind(
        issue.id,
        membership.organization_id,
        event.id,
        issue.id.startsWith('missing:') ? null : issue.id,
        issue.matchId,
        issue.teamNumber,
        issue.station,
        issue.id.startsWith('missing:') ? 'missing' : 'data_quality',
        JSON.stringify(issue.flags),
        now,
        now,
      ),
    );
    for (let index = 0; index < reviewStatements.length; index += 50)
      await env.DB.batch(reviewStatements.slice(index, index + 50));
  }
  const reviewRows = await env.DB.prepare(
    `SELECT review_cases.id, review_cases.status,
     review_cases.assigned_reviewer_id AS assignedReviewerId,
     users.name AS reviewerName, review_cases.reviewer_notes AS reviewerNotes,
     review_cases.resolved_at AS resolvedAt
     FROM review_cases LEFT JOIN users ON users.id = review_cases.assigned_reviewer_id
     WHERE review_cases.organization_id = ? AND review_cases.event_id = ?`,
  )
    .bind(membership.organization_id, event.id)
    .all<ReviewCaseRow>();
  const reviewById = new Map(reviewRows.results.map((item) => [item.id, item]));
  const issuesWithReview = allIssues.map((issue) => ({
    ...issue,
    review: reviewById.get(issue.id) ?? {
      id: issue.id,
      status: 'open' as const,
      assignedReviewerId: null,
      reviewerName: null,
      reviewerNotes: null,
      resolvedAt: null,
    },
  }));
  const unresolvedIssues = issuesWithReview.filter(
    (issue) =>
      issue.review.status === 'open' || issue.review.status === 'assigned',
  );
  const completedCoverage = coverage.filter((slot) => slot.completed);
  const scoutQuality = assignments.results.map((assignment) => {
    const assigned = completedCoverage.filter(
      (slot) => slot.scoutUserId === assignment.scoutUserId,
    );
    const unique = new Map(assigned.map((slot) => [slot.matchId, slot]));
    const slots = [...unique.values()];
    const scoutEntryIds = new Set(
      entries.results
        .filter((entry) => entry.scoutUserId === assignment.scoutUserId)
        .map((entry) => entry.id),
    );
    return {
      scoutUserId: assignment.scoutUserId,
      scoutName: assignment.scoutName,
      assigned: slots.length,
      submitted: slots.filter((slot) => slot.status === 'submitted').length,
      missed: slots.filter((slot) => slot.status !== 'submitted').length,
      late: slots.filter(
        (slot) =>
          slot.status === 'submitted' &&
          slot.actualTime &&
          slot.submittedAt &&
          slot.submittedAt > slot.actualTime + 10 * 60_000,
      ).length,
      flagged: unresolvedIssues.filter((issue) => scoutEntryIds.has(issue.id))
        .length,
      reopened: parsedEntries.filter(
        ({ entry, payload }) =>
          entry.scoutUserId === assignment.scoutUserId && payload.reopened,
      ).length,
    };
  });
  const uniqueScoutQuality = [
    ...new Map(scoutQuality.map((item) => [item.scoutUserId, item])).values(),
  ].sort((a, b) => b.missed - a.missed || b.flagged - a.flagged);
  return Response.json({
    coverage,
    issues: issuesWithReview,
    scoutQuality: uniqueScoutQuality,
    audit: audit.results,
    summary: {
      assigned: coverage.length,
      submitted: coverage.filter((slot) => slot.status !== 'missing').length,
      missing: coverage.filter((slot) => slot.status === 'missing').length,
      issues: unresolvedIssues.length,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to review scouting.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? AND disabled = 0 LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership || !canReopenEntries(membership.role))
    return Response.json(
      { error: 'Strategy, admin, or owner access is required.' },
      { status: 403 },
    );
  const parsed = reviewUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: 'Choose a valid review status.' },
      { status: 400 },
    );
  const resolved = ['corrected', 'valid', 'dismissed'].includes(
    parsed.data.status,
  );
  const result = await env.DB.prepare(
    `UPDATE review_cases SET status = ?, reviewer_notes = ?,
     assigned_reviewer_id = CASE WHEN ? THEN ? ELSE assigned_reviewer_id END,
     resolved_by = ?, resolved_at = ?, updated_at = ?
     WHERE id = ? AND organization_id = ?`,
  )
    .bind(
      parsed.data.status,
      parsed.data.reviewerNotes?.trim() || null,
      parsed.data.assignToMe ? 1 : 0,
      session.user.id,
      resolved ? session.user.id : null,
      resolved ? Date.now() : null,
      Date.now(),
      parsed.data.id,
      membership.organization_id,
    )
    .run();
  if (!result.meta.changes)
    return Response.json({ error: 'Review case not found.' }, { status: 404 });
  return Response.json({ updated: true });
}
