'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TeamTrendChart, type TeamTrend } from '@/components/team-trend-chart';
import { TeamRobotPhoto } from '@/components/team-robot-photo';

export type TeamStatsSummary = {
  teamNumber?: number;
  xp?: number | null;
  xAuto?: number | null;
  xTele?: number | null;
  xEnd?: number | null;
  epa?: number | null;
  eventRank?: number | null;
  medianPoints?: number;
  medianActiveFuel?: number;
  samples?: number;
  coverage?: number;
  scheduledMatches?: number;
  disabledRate?: number;
  averageDefense?: number;
  towerSuccessRate?: number;
  towerLevelCounts?: { level1: number; level2: number; level3: number };
  disabledMatches?: number;
  pointStdDev?: number;
};

type TeamAnalysis = TeamStatsSummary & {
  teamNumber: number;
  scheduledMatches: number;
  medianActiveFuel: number;
  pointStdDev: number;
  trends?: TeamTrend[];
  pit?: {
    drivetrain: string | null;
    swerveModule: string | null;
    weightLbs: number | null;
    photoObjectKey?: string | null;
    payload: Record<string, unknown>;
  } | null;
  entries?: Array<{
    id: string;
    matchKey: string;
    scoutName: string;
    reopened: boolean;
  }>;
  error?: string;
};

function number(value: number | null | undefined, suffix = '') {
  return value == null ? '—' : `${value.toFixed(1)}${suffix}`;
}

function text(value: unknown) {
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value ? value : '—';
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  return `${value}${['th', 'st', 'nd', 'rd'][Math.min(value % 10, 4)] ?? 'th'}`;
}

function metricRank(
  teams: TeamStatsSummary[],
  teamNumber: number | null,
  key: keyof TeamStatsSummary,
  lowerIsBetter = false,
) {
  if (!teamNumber) return null;
  const requiresScouting = [
    'medianPoints',
    'medianActiveFuel',
    'towerSuccessRate',
    'averageDefense',
    'pointStdDev',
    'disabledRate',
  ].includes(String(key));
  const ranked = teams.filter(
    (team) =>
      typeof team[key] === 'number' &&
      (!requiresScouting || (team.samples ?? 0) > 0),
  );
  const selected = ranked.find((team) => team.teamNumber === teamNumber)?.[key];
  if (typeof selected !== 'number') return null;
  const better = ranked.filter((team) => {
    const value = team[key] as number;
    return lowerIsBetter ? value < selected : value > selected;
  }).length;
  return `${ordinal(better + 1)} of ${ranked.length}`;
}

export function TeamStatsDialog({
  teamNumber,
  teamName,
  summary,
  eventSummaries = [],
  onOpenChange,
}: {
  teamNumber: number | null;
  teamName?: string;
  summary?: TeamStatsSummary;
  eventSummaries?: TeamStatsSummary[];
  onOpenChange: (open: boolean) => void;
}) {
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamNumber) {
      setAnalysis(null);
      setError('');
      return;
    }
    const controller = new AbortController();
    setAnalysis(null);
    setError('');
    void fetch(`/api/analysis?team=${teamNumber}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as TeamAnalysis;
        if (!response.ok)
          throw new Error(data.error ?? `Could not load Team ${teamNumber}.`);
        setAnalysis(data);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : 'Could not load team data.',
        );
      });
    return () => controller.abort();
  }, [teamNumber]);

  const stats = { ...summary, ...analysis };
  const pit = analysis?.pit;

  return (
    <Dialog open={teamNumber !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border bg-card text-card-foreground shadow-2xl sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Team {teamNumber ?? ''}
            {teamName ? ` — ${teamName}` : ''}
          </DialogTitle>
          <DialogDescription>
            Scouting, external ratings, reliability, and pit data for the
            current event.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!analysis && !error && (
          <p className="text-sm text-muted-foreground">Loading team data…</p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [
              'Match13 total xP',
              number(stats.xp),
              metricRank(eventSummaries, teamNumber, 'xp'),
            ],
            [
              'Auto xP',
              number(stats.xAuto),
              metricRank(eventSummaries, teamNumber, 'xAuto'),
            ],
            [
              'Teleop xP',
              number(stats.xTele),
              metricRank(eventSummaries, teamNumber, 'xTele'),
            ],
            [
              'Endgame xP',
              number(stats.xEnd),
              metricRank(eventSummaries, teamNumber, 'xEnd'),
            ],
            [
              'Match13 EPA',
              number(stats.epa),
              metricRank(eventSummaries, teamNumber, 'epa'),
            ],
            [
              'Median points',
              number(stats.medianPoints),
              metricRank(eventSummaries, teamNumber, 'medianPoints'),
            ],
            [
              'Median active FUEL',
              number(stats.medianActiveFuel),
              metricRank(eventSummaries, teamNumber, 'medianActiveFuel'),
            ],
            [
              'Tower successes',
              stats.towerLevelCounts
                ? `L1 ${stats.towerLevelCounts.level1} · L2 ${stats.towerLevelCounts.level2} · L3 ${stats.towerLevelCounts.level3}`
                : '—',
              null,
            ],
            [
              'Defense rating',
              number(stats.averageDefense),
              metricRank(eventSummaries, teamNumber, 'averageDefense'),
            ],
            [
              'Consistency',
              stats.pointStdDev == null
                ? '—'
                : `±${stats.pointStdDev.toFixed(1)}`,
              metricRank(eventSummaries, teamNumber, 'pointStdDev', true),
            ],
            ['Disabled matches', stats.disabledMatches ?? 0, null],
            [
              'Coverage',
              stats.scheduledMatches == null
                ? '—'
                : `${stats.samples ?? 0}/${stats.scheduledMatches}`,
              metricRank(eventSummaries, teamNumber, 'coverage'),
            ],
          ].map(([label, value, rank]) => (
            <div className="rounded-lg border bg-muted/30 p-3" key={label}>
              <strong className="block text-lg">{value}</strong>
              <span className="text-xs text-muted-foreground">{label}</span>
              {rank && (
                <Badge className="mt-2 block w-fit" variant="outline">
                  {rank}
                </Badge>
              )}
            </div>
          ))}
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Match trends</h3>
            <Badge variant="outline">
              {analysis?.trends?.length ?? 0} matches
            </Badge>
          </div>
          <TeamTrendChart trends={analysis?.trends ?? []} />
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Robot and pit scouting</h3>
          {pit ? (
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <TeamRobotPhoto
                teamNumber={teamNumber}
                hasPitPhoto={Boolean(pit.photoObjectKey)}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <span>
                  <strong className="block">{pit.drivetrain ?? '—'}</strong>
                  drivetrain
                </span>
                <span>
                  <strong className="block">{pit.swerveModule ?? '—'}</strong>
                  swerve module
                </span>
                <span>
                  <strong className="block">
                    {pit.weightLbs ? `${pit.weightLbs} lb` : '—'}
                  </strong>
                  weight
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.fieldAccess)}
                  </strong>
                  field access
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.climbCapability)}
                  </strong>
                  climb
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.shooterMount)}
                  </strong>
                  shooter mount
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.shooterBarrels)}
                  </strong>
                  shooter barrels
                </span>
                <span>
                  <strong className="block">
                    {pit.payload.adjustableHood ? 'Yes' : 'No'}
                  </strong>
                  adjustable hood
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.fuelCapacity)}
                  </strong>
                  fuel capacity
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.autonomousStart)}
                  </strong>
                  auto starts
                </span>
                <span>
                  <strong className="block">
                    {text(pit.payload.autonomousSwipe)}
                  </strong>
                  auto swipes
                </span>
                <span>
                  <strong className="block">
                    {pit.payload.autonomousDepot ? 'Yes' : 'No'}
                  </strong>
                  visits depot in auto
                </span>
                <span>
                  <strong className="block">
                    {pit.payload.autonomousOutpost ? 'Yes' : 'No'}
                  </strong>
                  visits outpost in auto
                </span>
                {typeof pit.payload.notes === 'string' && pit.payload.notes ? (
                  <span className="col-span-2 sm:col-span-4">
                    <strong className="block">Notes</strong>
                    {pit.payload.notes}
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
              <TeamRobotPhoto teamNumber={teamNumber} className="w-full" />
              <p className="text-sm text-muted-foreground">
                No pit report yet.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="font-semibold">Submitted entries</h3>
          {analysis?.entries?.length ? (
            <div className="divide-y rounded-lg border">
              {analysis.entries.map((entry) => (
                <div
                  className="flex items-center justify-between gap-3 p-3"
                  key={entry.id}
                >
                  <strong>
                    {entry.matchKey.split('_').at(-1)?.toUpperCase()}
                  </strong>
                  <span className="text-muted-foreground">
                    {entry.scoutName}
                  </span>
                  <Badge variant="outline">
                    {entry.reopened ? 'Editable' : 'Locked'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No submitted match entries yet.
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
