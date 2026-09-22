'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Operations = {
  coverage: Array<{
    matchId: string;
    matchKey: string;
    matchNumber: number;
    teamNumber: number;
    station: string;
    scoutName: string;
    status: 'missing' | 'covered' | 'submitted';
    completed: boolean;
    submittedAt: number | null;
  }>;
  issues: Array<{
    id: string;
    matchKey: string;
    teamNumber: number;
    scoutName: string;
    submittedAt: number | null;
    points: number | null;
    activeFuel: number | null;
    cycles: number | null;
    flags: string[];
    reopened: boolean;
    reviewSource: string | null;
    matchId: string;
    station: string;
    videos: Array<{ type: string; key: string }>;
  }>;
  audit: Array<{
    id: string;
    entryId: string;
    action: string;
    actorName: string;
    createdAt: number;
  }>;
  summary: {
    assigned: number;
    submitted: number;
    missing: number;
    issues: number;
  };
  scoutQuality: Array<{
    scoutUserId: string;
    scoutName: string;
    assigned: number;
    submitted: number;
    missed: number;
    late: number;
    flagged: number;
    reopened: number;
  }>;
};

function matchLabel(key: string) {
  return key.split('_').at(-1)?.toUpperCase() ?? key;
}

export function ScoutingOperations({
  mode,
  onVideoReview,
}: {
  mode: 'coverage' | 'review';
  onVideoReview?: (issue: Operations['issues'][number]) => void;
}) {
  const [data, setData] = useState<Operations | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/scouting-operations');
      const result = (await response.json()) as Operations & { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? 'Scouting status unavailable.');
      setData(result);
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Scouting status unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  async function reopen(entryId: string) {
    setMessage('');
    const response = await fetch('/api/entries/reopen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entryId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(result.error ?? 'Could not reopen the entry.');
      return;
    }
    setMessage('Entry reopened. The scout can now submit a correction.');
    await load();
  }

  if (mode === 'coverage') {
    const upcoming =
      data?.coverage
        .filter((slot) => !slot.completed)
        .sort((a, b) => a.matchNumber - b.matchNumber)
        .slice(0, 18) ?? [];
    const matches = upcoming.reduce((groups, slot) => {
      groups.set(slot.matchId, [...(groups.get(slot.matchId) ?? []), slot]);
      return groups;
    }, new Map<string, typeof upcoming>());
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            <Users /> Live station coverage
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">
              {data?.summary.submitted ?? 0} submitted
            </Badge>
            <Badge
              variant={(data?.summary.missing ?? 0) ? 'destructive' : 'outline'}
            >
              {data?.summary.missing ?? 0} waiting
            </Badge>
            <Button size="sm" variant="outline" onClick={() => void load()}>
              <RefreshCw /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground">
              Loading live coverage…
            </p>
          )}
          {[...matches.values()].slice(0, 3).map((slots) => (
            <div className="rounded-lg border p-3" key={slots[0].matchId}>
              <strong>{matchLabel(slots[0].matchKey)}</strong>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {slots.map((slot) => (
                  <div className="rounded-md border p-2" key={slot.station}>
                    <div className="flex items-center justify-between">
                      <strong>{slot.station.toUpperCase()}</strong>
                      {slot.status === 'missing' ? (
                        <AlertTriangle className="size-4 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="size-4 text-green-600" />
                      )}
                    </div>
                    <p>Team {slot.teamNumber}</p>
                    <small className="text-muted-foreground">
                      {slot.scoutName}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!loading && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No upcoming assignments.
            </p>
          )}
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <CardTitle>
          <AlertTriangle /> Scouting data review
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">
            {data?.summary.submitted ?? 0}/{data?.summary.assigned ?? 0} covered
          </Badge>
          <Badge
            variant={(data?.summary.issues ?? 0) ? 'destructive' : 'outline'}
          >
            {data?.summary.issues ?? 0} issues
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground">Checking submissions…</p>
        )}
        {data?.scoutQuality.length ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Flags identify reports that need human review; they are not an
              automatic judgment of scout performance. TBA comparisons use
              alliance totals, not individual robot scoring.
            </p>
            <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Scout</th>
                  <th className="p-2">Completed shifts</th>
                  <th className="p-2">Submitted</th>
                  <th className="p-2">Missed</th>
                  <th className="p-2">Late</th>
                  <th className="p-2">Flagged</th>
                  <th className="p-2">Reopened</th>
                </tr>
              </thead>
              <tbody>
                {data.scoutQuality.map((scout) => (
                  <tr className="border-t" key={scout.scoutUserId}>
                    <th className="p-2">{scout.scoutName}</th>
                    <td className="p-2">{scout.assigned}</td>
                    <td className="p-2">{scout.submitted}</td>
                    <td className="p-2">{scout.missed}</td>
                    <td className="p-2">{scout.late}</td>
                    <td className="p-2">{scout.flagged}</td>
                    <td className="p-2">{scout.reopened}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : null}
        {data?.issues.map((issue) => (
          <div className="schedule-row" key={issue.id}>
            <strong>
              {matchLabel(issue.matchKey)} · {issue.teamNumber}
            </strong>
            <span>
              {issue.scoutName}
              {issue.points === null
                ? ''
                : ` · ${issue.points} pts · ${issue.activeFuel} active FUEL · ${issue.cycles} cycles`}
              {' · '}
              {issue.flags.join(' · ')}
            </span>
            <div className="flex flex-wrap gap-2">
              {!issue.id.startsWith('missing:') && !issue.reopened && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void reopen(issue.id)}
                >
                  <RotateCcw /> Reopen
                </Button>
              )}
              {onVideoReview && issue.id.startsWith('missing:') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onVideoReview(issue)}
                >
                  <Film /> Scout from video
                </Button>
              )}
              {issue.reviewSource && (
                <Badge variant="outline">Video reviewed</Badge>
              )}
            </div>
          </div>
        ))}
        {!loading && data?.issues.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No missing or suspicious submissions found.
          </p>
        )}
        {data?.audit.length ? (
          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              Recent correction history
            </summary>
            <div className="mt-2 space-y-1">
              {data.audit.map((item) => (
                <p className="text-sm text-muted-foreground" key={item.id}>
                  {item.actorName} {item.action} an entry ·{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              ))}
            </div>
          </details>
        ) : null}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
