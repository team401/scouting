'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  GripVertical,
  Printer,
  RotateCcw,
  Save,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  emptyPickList,
  type ConsensusEntry,
  type PickListData,
  type PickListEntry,
} from '@/lib/pick-list';

type TeamMetric = {
  teamNumber: number;
  medianPoints: number;
  epa: number | null;
  opr: number | null;
};
type PickListsResponse = {
  personal: PickListData | null;
  official: PickListData | null;
  consensus: ConsensusEntry[];
  ballotCount: number;
  canEditOfficial: boolean;
  error?: string;
};

function seededList(
  teams: TeamMetric[],
  organizationTeamNumber: number,
): PickListData {
  return {
    entries: [...teams]
      .filter((team) => team.teamNumber !== organizationTeamNumber)
      .sort((a, b) => (b.epa ?? b.medianPoints) - (a.epa ?? a.medianPoints))
      .map((team) => ({
        teamNumber: team.teamNumber,
        note: '',
        tier: 'first' as const,
        avoid: false,
      })),
    selections: [],
  };
}

function reorder(entries: PickListEntry[], from: number, to: number) {
  const next = [...entries];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

export function PickListWorkspace({
  teams,
  eventKey,
  organizationTeamNumber,
}: {
  teams: TeamMetric[];
  eventKey: string;
  organizationTeamNumber: number;
}) {
  const [response, setResponse] = useState<PickListsResponse | null>(null);
  const [mode, setMode] = useState<'personal' | 'official' | 'selection'>(
    'personal',
  );
  const [personal, setPersonal] = useState<PickListData>(emptyPickList);
  const [official, setOfficial] = useState<PickListData>(emptyPickList);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [allianceNumber, setAllianceNumber] = useState(1);
  const dragIndex = useRef<number | null>(null);
  const cacheKey = `pick-lists:${eventKey}`;
  const draftKey = `pick-lists-draft:${eventKey}`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let hasDraft = false;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached) as PickListsResponse;
          if (!cancelled) {
            setResponse(data);
            setPersonal(
              data.personal ?? seededList(teams, organizationTeamNumber),
            );
            setOfficial(data.official ?? emptyPickList);
          }
        }
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          const data = JSON.parse(draft) as {
            personal: PickListData;
            official: PickListData;
          };
          if (!cancelled) {
            setPersonal(data.personal);
            setOfficial(data.official);
          }
          hasDraft = true;
        }
      } catch {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(draftKey);
      }
      try {
        const result = await fetch('/api/pick-lists');
        const data = (await result.json()) as PickListsResponse;
        if (!result.ok)
          throw new Error(data.error ?? 'Unable to load pick lists.');
        if (cancelled) return;
        setResponse(data);
        if (!hasDraft) {
          setPersonal(
            data.personal ?? seededList(teams, organizationTeamNumber),
          );
          setOfficial(data.official ?? emptyPickList);
        }
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (error) {
        if (cancelled) return;
        setMessage(
          error instanceof Error ? error.message : 'Unable to load pick lists.',
        );
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, draftKey, eventKey, organizationTeamNumber, teams]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(draftKey, JSON.stringify({ personal, official }));
  }, [draftKey, hydrated, official, personal]);

  const list = mode === 'personal' ? personal : official;
  const setList = mode === 'personal' ? setPersonal : setOfficial;
  const metrics = new Map(teams.map((team) => [team.teamNumber, team]));

  async function save(target: 'personal' | 'official', data: PickListData) {
    setSaving(true);
    setMessage('');
    try {
      const result = await fetch('/api/pick-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: target, data }),
      });
      const body = (await result.json()) as { error?: string };
      if (!result.ok)
        throw new Error(body.error ?? 'Unable to save the pick list.');
      let next: PickListsResponse = {
        personal: null,
        official: null,
        consensus: [],
        ballotCount: 0,
        canEditOfficial: true,
        ...response,
        [target]: data,
      };
      if (target === 'personal') {
        const refreshed = await fetch('/api/pick-lists');
        if (refreshed.ok) next = (await refreshed.json()) as PickListsResponse;
      }
      setResponse(next);
      localStorage.setItem(cacheKey, JSON.stringify(next));
      setMessage(
        target === 'official'
          ? 'Definitive list saved.'
          : 'Personal list saved.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save the pick list.',
      );
    } finally {
      setSaving(false);
    }
  }

  function updateEntry(index: number, patch: Partial<PickListEntry>) {
    setList({
      ...list,
      entries: list.entries.map((entry, item) =>
        item === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function markTaken(teamNumber: number) {
    if (official.selections.some((item) => item.teamNumber === teamNumber))
      return;
    setOfficial({
      ...official,
      selections: [...official.selections, { teamNumber, allianceNumber }],
    });
  }

  function exportOfficialList() {
    const headings = [
      'rank',
      'team_number',
      'tier',
      'avoid',
      'epa',
      'opr',
      'selected_by_alliance',
      'notes',
    ];
    const quote = (value: string | number | boolean | null | undefined) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = official.entries.map((entry, index) => {
      const team = metrics.get(entry.teamNumber);
      const selection = official.selections.find(
        (item) => item.teamNumber === entry.teamNumber,
      );
      return [
        index + 1,
        entry.teamNumber,
        entry.tier,
        entry.avoid,
        team?.epa,
        team?.opr,
        selection?.allianceNumber,
        entry.note,
      ]
        .map(quote)
        .join(',');
    });
    const url = URL.createObjectURL(
      new Blob([[headings.join(','), ...rows].join('\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${eventKey}-official-pick-list.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function selectionRole(alliance: number, teamNumber: number) {
    const index = official.selections
      .filter((item) => item.allianceNumber === alliance)
      .findIndex((item) => item.teamNumber === teamNumber);
    return ['Captain', 'First pick', 'Second pick'][index] ?? `Pick ${index}`;
  }

  return (
    <Card className="pick-list-print sm:col-span-2">
      <CardHeader>
        <div>
          <CardTitle>Pick lists and alliance selection</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personal ballots feed consensus; the definitive list drives the live
            selection board.
          </p>
        </div>
        <Badge variant="outline">{response?.ballotCount ?? 0} ballots</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="pick-list-controls flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={mode === 'personal' ? 'default' : 'outline'}
            onClick={() => setMode('personal')}
          >
            <UserRoundCheck /> My list
          </Button>
          <Button
            size="sm"
            variant={mode === 'official' ? 'default' : 'outline'}
            onClick={() => setMode('official')}
          >
            <Users /> Definitive list
          </Button>
          <Button
            size="sm"
            variant={mode === 'selection' ? 'default' : 'outline'}
            onClick={() => setMode('selection')}
          >
            <Check /> Alliance selection
          </Button>
          {mode !== 'personal' && official.entries.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={exportOfficialList}>
                <Download /> Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer /> Print
              </Button>
            </>
          )}
        </div>

        {mode !== 'selection' && (
          <>
            <div className="flex flex-wrap gap-2">
              {mode === 'official' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOfficial({
                      entries: (response?.consensus ?? []).map((item) => ({
                        teamNumber: item.teamNumber,
                        note: '',
                        tier: 'first',
                        avoid: false,
                      })),
                      selections: official.selections,
                    })
                  }
                >
                  Start from consensus
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setList(seededList(teams, organizationTeamNumber))
                }
              >
                <RotateCcw /> Seed from metrics
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => void save(mode, list)}
              >
                <Save /> {saving ? 'Saving…' : 'Save list'}
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <div className="min-w-[760px] divide-y">
                {list.entries.map((entry, index) => {
                  const team = metrics.get(entry.teamNumber);
                  const consensus = response?.consensus.find(
                    (item) => item.teamNumber === entry.teamNumber,
                  );
                  return (
                    <div
                      key={entry.teamNumber}
                      draggable
                      onDragStart={() => {
                        dragIndex.current = index;
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (dragIndex.current !== null)
                          setList({
                            ...list,
                            entries: reorder(
                              list.entries,
                              dragIndex.current,
                              index,
                            ),
                          });
                        dragIndex.current = null;
                      }}
                      className={
                        entry.avoid
                          ? 'grid grid-cols-[36px_54px_90px_80px_80px_120px_1fr] items-center gap-2 bg-destructive/5 p-2'
                          : 'grid grid-cols-[36px_54px_90px_80px_80px_120px_1fr] items-center gap-2 p-2'
                      }
                    >
                      <GripVertical className="cursor-grab text-muted-foreground" />
                      <strong>#{index + 1}</strong>
                      <strong>{entry.teamNumber}</strong>
                      <span className="text-sm">
                        EPA {team?.epa?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-sm">
                        OPR {team?.opr?.toFixed(1) ?? '—'}
                      </span>
                      <span className="text-sm">
                        Consensus{' '}
                        {consensus ? consensus.averageRank.toFixed(1) : '—'}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 rounded-md border bg-transparent px-2"
                          value={entry.tier}
                          onChange={(event) =>
                            updateEntry(index, {
                              tier: event.target.value as PickListEntry['tier'],
                            })
                          }
                        >
                          <option value="first">First pick</option>
                          <option value="second">Second pick</option>
                          <option value="do-not-pick">Do not pick</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={entry.avoid}
                            onChange={(event) =>
                              updateEntry(index, {
                                avoid: event.target.checked,
                              })
                            }
                          />{' '}
                          Avoid
                        </label>
                        <input
                          aria-label={`Notes for team ${entry.teamNumber}`}
                          className="h-9 min-w-40 flex-1 rounded-md border bg-transparent px-2"
                          placeholder="Notes"
                          value={entry.note}
                          onChange={(event) =>
                            updateEntry(index, { note: event.target.value })
                          }
                        />
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={index === 0}
                          onClick={() =>
                            setList({
                              ...list,
                              entries: reorder(list.entries, index, index - 1),
                            })
                          }
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={index === list.entries.length - 1}
                          onClick={() =>
                            setList({
                              ...list,
                              entries: reorder(list.entries, index, index + 1),
                            })
                          }
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {mode === 'selection' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div>
              <div className="pick-list-controls mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">
                  Selecting for alliance
                </span>
                <select
                  className="h-9 rounded-md border bg-transparent px-2"
                  value={allianceNumber}
                  onChange={(event) =>
                    setAllianceNumber(Number(event.target.value))
                  }
                >
                  {Array.from({ length: 8 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      #{index + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {official.entries
                  .map((entry, rank) => ({ entry, rank }))
                  .filter(
                    ({ entry }) =>
                      !entry.avoid &&
                      entry.tier !== 'do-not-pick' &&
                      !official.selections.some(
                        (item) => item.teamNumber === entry.teamNumber,
                      ),
                  )
                  .map(({ entry, rank }) => (
                    <button
                      className="rounded-lg border p-3 text-left hover:bg-accent"
                      key={entry.teamNumber}
                      onClick={() => markTaken(entry.teamNumber)}
                    >
                      <strong>
                        #{rank + 1} · Team {entry.teamNumber}
                      </strong>
                      <span className="block text-xs text-muted-foreground">
                        {entry.note || 'Mark as selected'}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <strong>Selections</strong>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() => void save('official', official)}
                >
                  <Save /> Save
                </Button>
              </div>
              {Array.from({ length: 8 }, (_, alliance) => alliance + 1).map(
                (alliance) => {
                  const selections = official.selections.filter(
                    (item) => item.allianceNumber === alliance,
                  );
                  return (
                    <div className="rounded-md bg-muted p-2" key={alliance}>
                      <strong>Alliance {alliance}</strong>
                      {selections.length === 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Open
                        </span>
                      ) : (
                        selections.map((selection) => (
                          <div
                            className="mt-1 flex items-center justify-between"
                            key={selection.teamNumber}
                          >
                            <span>
                              <small className="mr-1 text-muted-foreground">
                                {selectionRole(alliance, selection.teamNumber)}
                              </small>
                              {selection.teamNumber}
                            </span>
                            <Button
                              className="pick-list-controls"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setOfficial({
                                  ...official,
                                  selections: official.selections.filter(
                                    (item) =>
                                      item.teamNumber !== selection.teamNumber,
                                  ),
                                })
                              }
                            >
                              Undo
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  );
                },
              )}
              {official.selections.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No teams selected yet.
                </p>
              )}
            </div>
          </div>
        )}
        {message && (
          <output className="text-sm text-muted-foreground">{message}</output>
        )}
      </CardContent>
    </Card>
  );
}
