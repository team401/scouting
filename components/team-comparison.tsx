'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import type { TeamTrend } from '@/components/team-trend-chart';

export type ComparisonTeam = {
  teamNumber: number;
  name?: string | null;
  xp: number | null;
  epa: number | null;
  samples: number;
  coverage: number;
  scheduledMatches: number;
  medianPoints: number;
  medianActiveFuel: number;
  towerSuccessRate: number;
  towerLevelCounts: { level1: number; level2: number; level3: number };
  disabledMatches: number;
  disabledRate: number;
  averageDefense: number;
  pointStdDev: number;
};

type AnalysisResponse = Omit<ComparisonTeam, 'xp' | 'epa'> & {
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
  matches,
}: {
  teams: ComparisonTeam[];
  matches: Array<{
    key: string;
    label: string;
    red: number[];
    blue: number[];
  }>;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [selectedMatchKey, setSelectedMatchKey] = useState(
    matches[0]?.key ?? '',
  );
  const [teamInput, setTeamInput] = useState('');
  const [details, setDetails] = useState<Record<number, AnalysisResponse>>({});
  const [message, setMessage] = useState('');
  const requestedTeams = useRef(new Set<number>());

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.teamNumber, team])),
    [teams],
  );
  const teamNumbers = useMemo(
    () => teams.map((team) => String(team.teamNumber)),
    [teams],
  );
  const teamLabel = (teamNumber: number) => {
    const name = teamMap.get(teamNumber)?.name;
    return name ? `Team ${teamNumber} — ${name}` : `Team ${teamNumber}`;
  };
  const selectedMatch = matches.find((match) => match.key === selectedMatchKey);

  useEffect(() => {
    if (matches.some((match) => match.key === selectedMatchKey)) return;
    setSelectedMatchKey(matches[0]?.key ?? '');
  }, [matches, selectedMatchKey]);

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
        <CardTitle>Team comparison</CardTitle>
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
            <Combobox
              items={teamNumbers}
              value={null}
              inputValue={teamInput}
              onInputValueChange={(value) =>
                setTeamInput(value.replace(/\D/g, ''))
              }
              onValueChange={(value) => {
                if (value) addTeam(Number(value));
              }}
            >
              <ComboboxInput
                aria-label="Team number to compare"
                inputMode="numeric"
                placeholder="Team number"
                className="w-full"
              />
              <ComboboxContent>
                <ComboboxEmpty>No matching teams</ComboboxEmpty>
                <ComboboxList>
                  {(teamNumber: string) => (
                    <ComboboxItem key={teamNumber} value={teamNumber}>
                      {teamLabel(Number(teamNumber))}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <Button type="submit" variant="outline">
              <Plus /> Add
            </Button>
          </form>
          <div className="flex min-w-64 flex-1 gap-2 sm:flex-initial">
            <label className="sr-only" htmlFor="comparison-match">
              Match to compare
            </label>
            <select
              id="comparison-match"
              className="h-9 rounded-md border px-3 text-sm"
              value={selectedMatchKey}
              onChange={(event) => setSelectedMatchKey(event.target.value)}
            >
              {matches.map((match) => (
                <option value={match.key} key={match.key}>
                  {match.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedMatch}
              onClick={() => {
                if (!selectedMatch) return;
                setSelected(
                  [
                    ...new Set([...selectedMatch.red, ...selectedMatch.blue]),
                  ].slice(0, 6),
                );
                setMessage('');
              }}
            >
              Load teams
            </Button>
          </div>
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
            <div className="team-comparison-table overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Team</th>
                    <th className="p-2">Match13 xP</th>
                    <th className="p-2">EPA</th>
                    <th className="p-2">Median pts</th>
                    <th className="p-2">Tower</th>
                    <th className="p-2">Disabled</th>
                    <th className="p-2">Defense</th>
                    <th className="p-2">Consistency</th>
                    <th className="p-2">Matches scouted</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeams.map((team) => (
                    <tr
                      key={team.teamNumber}
                      className="border-b last:border-0"
                    >
                      <th className="p-2 text-left">{team.teamNumber}</th>
                      <td className="p-2">{formatNumber(team.xp)}</td>
                      <td className="p-2">{formatNumber(team.epa)}</td>
                      <td className="p-2">{team.medianPoints.toFixed(1)}</td>
                      <td className="p-2">
                        L1 {team.towerLevelCounts.level1} · L2{' '}
                        {team.towerLevelCounts.level2} · L3{' '}
                        {team.towerLevelCounts.level3}
                      </td>
                      <td className="p-2">{team.disabledMatches}</td>
                      <td className="p-2">{team.averageDefense.toFixed(1)}</td>
                      <td className="p-2">±{team.pointStdDev.toFixed(1)}</td>
                      <td className="p-2">
                        {team.samples}/{team.scheduledMatches}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="team-comparison-cards">
              {selectedTeams.map((team) => (
                <div className="rounded-lg border p-3" key={team.teamNumber}>
                  <strong className="text-lg">Team {team.teamNumber}</strong>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <span>
                      <strong>{formatNumber(team.xp)}</strong>
                      <small className="block text-muted-foreground">
                        Match13 xP
                      </small>
                    </span>
                    <span>
                      <strong>{formatNumber(team.epa)}</strong>
                      <small className="block text-muted-foreground">EPA</small>
                    </span>
                    <span>
                      <strong>{team.medianPoints.toFixed(1)}</strong>
                      <small className="block text-muted-foreground">
                        Median points
                      </small>
                    </span>
                    <span>
                      <strong>{team.averageDefense.toFixed(1)}</strong>
                      <small className="block text-muted-foreground">
                        Defense
                      </small>
                    </span>
                    <span>
                      <strong>{team.disabledMatches}</strong>
                      <small className="block text-muted-foreground">
                        Disabled
                      </small>
                    </span>
                    <span>
                      <strong>
                        {team.samples}/{team.scheduledMatches}
                      </strong>
                      <small className="block text-muted-foreground">
                        Matches scouted
                      </small>
                    </span>
                  </div>
                </div>
              ))}
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
