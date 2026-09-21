'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GitCompareArrows, Plus, X } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { TeamTrend } from '@/components/team-trend-chart';

export type ComparisonTeam = {
  teamNumber: number;
  epa: number | null;
  opr: number | null;
  samples: number;
  coverage: number;
  medianPoints: number;
  medianActiveFuel: number;
  medianFuelPerCycle: number;
  towerSuccessRate: number;
  disabledRate: number;
  averageDefense: number;
  pointStdDev: number;
};

type AnalysisResponse = Omit<ComparisonTeam, 'epa' | 'opr'> & {
  trends?: TeamTrend[];
  error?: string;
};

const colors = [
  '#0ea5e9',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

function formatNumber(value: number | null, digits = 1) {
  return value === null ? '—' : value.toFixed(digits);
}

export function TeamComparison({
  teams,
  matchTeams,
}: {
  teams: ComparisonTeam[];
  matchTeams: number[];
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [teamInput, setTeamInput] = useState('');
  const [details, setDetails] = useState<Record<number, AnalysisResponse>>({});
  const [message, setMessage] = useState('');
  const requestedTeams = useRef(new Set<number>());

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.teamNumber, team])),
    [teams],
  );

  useEffect(() => {
    const missing = selected.filter((team) => !details[team]);
    if (missing.length === 0) return;
    const unrequested = missing.filter(
      (team) => !requestedTeams.current.has(team),
    );
    if (unrequested.length === 0) return;
    for (const team of unrequested) requestedTeams.current.add(team);
    let cancelled = false;
    void Promise.all(
      unrequested.map(async (team) => {
        const response = await fetch(`/api/analysis?team=${team}`);
        const data = (await response.json()) as AnalysisResponse;
        if (!response.ok)
          throw new Error(data.error ?? `Could not load Team ${team}.`);
        return data;
      }),
    )
      .then((loaded) => {
        if (cancelled) return;
        setDetails((current) => ({
          ...current,
          ...Object.fromEntries(loaded.map((team) => [team.teamNumber, team])),
        }));
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not load team trends.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [details, selected]);

  function addTeam(teamNumber: number) {
    if (!teamMap.has(teamNumber)) {
      setMessage(`Team ${teamNumber} is not in the current event.`);
      return;
    }
    if (selected.includes(teamNumber)) {
      setMessage(`Team ${teamNumber} is already selected.`);
      return;
    }
    if (selected.length >= 6) {
      setMessage('Compare up to six teams at a time.');
      return;
    }
    setSelected((current) => [...current, teamNumber]);
    setTeamInput('');
    setMessage('');
  }

  const selectedTeams = selected.flatMap((teamNumber) => {
    const summary = teamMap.get(teamNumber);
    if (!summary) return [];
    return [{ ...summary, ...details[teamNumber], teamNumber }];
  });
  const trendData = [
    ...new Set(
      selectedTeams
        .flatMap((team) => team.trends ?? [])
        .map((trend) => trend.matchNumber),
    ),
  ]
    .sort((a, b) => a - b)
    .map((matchNumber) => ({
      match: `Q${matchNumber}`,
      ...Object.fromEntries(
        selectedTeams.map((team) => [
          `team${team.teamNumber}`,
          team.trends?.find((trend) => trend.matchNumber === matchNumber)
            ?.points ?? null,
        ]),
      ),
    }));

  return (
    <Card className="sm:col-span-2">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitCompareArrows /> Team comparison
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compare scouting output, external ratings, reliability, and trends.
          </p>
        </div>
        <Badge variant="outline">{selected.length}/6 selected</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <form
            className="flex min-w-56 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const team = Number(teamInput);
              if (Number.isInteger(team) && team > 0) addTeam(team);
              else setMessage('Enter a valid team number.');
            }}
          >
            <Input
              aria-label="Team number to compare"
              inputMode="numeric"
              list="comparison-teams"
              placeholder="Team number"
              value={teamInput}
              onChange={(event) =>
                setTeamInput(event.target.value.replace(/\D/g, ''))
              }
            />
            <datalist id="comparison-teams">
              {teams.map((team) => (
                <option key={team.teamNumber} value={team.teamNumber}>
                  Team {team.teamNumber}
                </option>
              ))}
            </datalist>
            <Button type="submit" variant="outline">
              <Plus /> Add
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            disabled={matchTeams.length === 0}
            onClick={() => {
              setSelected([...new Set(matchTeams)].slice(0, 6));
              setMessage('');
            }}
          >
            Current match teams
          </Button>
          {selected.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected([])}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.map((team) => (
            <Badge key={team} variant="secondary" className="gap-1 py-1.5">
              Team {team}
              <button
                type="button"
                aria-label={`Remove Team ${team}`}
                onClick={() =>
                  setSelected((current) =>
                    current.filter((item) => item !== team),
                  )
                }
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
        {message && <p className="text-sm text-destructive">{message}</p>}
        {selectedTeams.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Team</th>
                    <th className="p-2">EPA</th>
                    <th className="p-2">OPR</th>
                    <th className="p-2">Median pts</th>
                    <th className="p-2">FUEL/cycle</th>
                    <th className="p-2">Tower</th>
                    <th className="p-2">Disabled</th>
                    <th className="p-2">Defense</th>
                    <th className="p-2">Consistency</th>
                    <th className="p-2">Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeams.map((team) => (
                    <tr
                      key={team.teamNumber}
                      className="border-b last:border-0"
                    >
                      <th className="p-2 text-left">{team.teamNumber}</th>
                      <td className="p-2">{formatNumber(team.epa)}</td>
                      <td className="p-2">{formatNumber(team.opr)}</td>
                      <td className="p-2">{team.medianPoints.toFixed(1)}</td>
                      <td className="p-2">
                        {team.medianFuelPerCycle.toFixed(1)}
                      </td>
                      <td className="p-2">
                        {Math.round(team.towerSuccessRate * 100)}%
                      </td>
                      <td className="p-2">
                        {Math.round(team.disabledRate * 100)}%
                      </td>
                      <td className="p-2">{team.averageDefense.toFixed(1)}</td>
                      <td className="p-2">±{team.pointStdDev.toFixed(1)}</td>
                      <td className="p-2">
                        {Math.round(team.coverage * 100)}% ({team.samples})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Observed points by match</h3>
              {trendData.length > 0 ? (
                <div
                  className="h-72 w-full"
                  aria-label="Compared team performance trends"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData}
                      margin={{ top: 8, right: 16, left: -12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="match" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {selectedTeams.map((team, index) => (
                        <Line
                          key={team.teamNumber}
                          type="monotone"
                          connectNulls
                          dataKey={`team${team.teamNumber}`}
                          name={`Team ${team.teamNumber}`}
                          stroke={colors[index % colors.length]}
                          strokeWidth={3}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No synchronized match data is available for these teams yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add teams individually or load all six teams from the selected
            match.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
