'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChartNoAxesColumn,
  GripVertical,
  Plus,
  Search,
  Undo2,
  UserX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TeamStatsDialog } from '@/components/team-stats-dialog';
import {
  emptyPickList,
  nextAlliancePick,
  type ConsensusEntry,
  type PickListData,
  type PickListEntry,
} from '@/lib/pick-list';

type TeamMetric = {
  teamNumber: number;
  name?: string;
  medianPoints: number;
  medianActiveFuel?: number;
  towerSuccessRate?: number;
  disabledRate?: number;
  averageDefense?: number;
  pointStdDev?: number;
  eventRank?: number | null;
  wins?: number;
  losses?: number;
  ties?: number;
  samples?: number;
  coverage?: number;
  xp: number | null;
  xAuto?: number | null;
  xTele?: number | null;
  xEnd?: number | null;
  opr: number | null;
};
type PickListsResponse = {
  personal: PickListData | null;
  official: PickListData | null;
  consensus: ConsensusEntry[];
  ballotCount: number;
  canEditOfficial: boolean;
  ballots?: Array<{
    ownerUserId: string;
    ownerName: string;
    updatedAt: number;
    data: PickListData;
  }>;
  error?: string;
};

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
  userId,
  initialMode = 'personal',
}: {
  teams: TeamMetric[];
  eventKey: string;
  organizationTeamNumber: number;
  userId: string;
  initialMode?: 'personal' | 'review' | 'official' | 'selection';
}) {
  const [response, setResponse] = useState<PickListsResponse | null>(null);
  const [mode, setMode] = useState<
    'personal' | 'review' | 'official' | 'selection'
  >(initialMode);
  const [reviewOwnerId, setReviewOwnerId] = useState('');
  const [personal, setPersonal] = useState<PickListData>(emptyPickList);
  const [official, setOfficial] = useState<PickListData>(emptyPickList);
  const [message, setMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [selectionSearch, setSelectionSearch] = useState('');
  const [builderSearch, setBuilderSearch] = useState('');
  const [statsTeam, setStatsTeam] = useState<number | null>(null);
  const [selectionListMode, setSelectionListMode] = useState<
    'rankings' | 'picklist'
  >('picklist');
  const standaloneSelection = initialMode === 'selection';
  const dragIndex = useRef<number | null>(null);
  const lastSavedPersonal = useRef(JSON.stringify(emptyPickList));
  const lastSavedOfficial = useRef(JSON.stringify(emptyPickList));
  // Version these keys so clients do not restore the old generated default list.
  const cacheKey = `pick-lists-v3:${eventKey}:${userId}`;
  const draftKey = `pick-lists-draft-v3:${eventKey}:${userId}`;

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
            setPersonal(data.personal ?? emptyPickList);
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
          const nextPersonal = data.personal ?? emptyPickList;
          const nextOfficial = data.official ?? emptyPickList;
          setPersonal(nextPersonal);
          setOfficial(nextOfficial);
          lastSavedPersonal.current = JSON.stringify(
            data.personal ?? emptyPickList,
          );
          lastSavedOfficial.current = JSON.stringify(nextOfficial);
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
  const nextPick = nextAlliancePick(official.selections);
  const reviewedBallot = response?.ballots?.find(
    (ballot) => ballot.ownerUserId === reviewOwnerId,
  );
  const scoutDistribution = new Map<
    number,
    { first: number; second: number; dnp: number; ranked: number }
  >();
  for (const ballot of response?.ballots ?? []) {
    for (const entry of ballot.data.entries) {
      const counts = scoutDistribution.get(entry.teamNumber) ?? {
        first: 0,
        second: 0,
        dnp: 0,
        ranked: 0,
      };
      counts.ranked += 1;
      if (entry.tier === 'first') counts.first += 1;
      else if (entry.tier === 'second') counts.second += 1;
      else counts.dnp += 1;
      scoutDistribution.set(entry.teamNumber, counts);
    }
  }

  function rankingDistribution(teamNumber: number) {
    if (mode !== 'official') return null;
    const counts = scoutDistribution.get(teamNumber) ?? {
      first: 0,
      second: 0,
      dnp: 0,
      ranked: 0,
    };
    const denominator = Math.max(response?.ballotCount ?? 0, 1);
    return (
      <div
        className="mt-1"
        title={`${counts.first} first pick, ${counts.second} second pick, ${counts.dnp} do not pick across ${response?.ballotCount ?? 0} scout lists`}
      >
        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          <span
            className="bg-emerald-500"
            style={{ width: `${(counts.first / denominator) * 100}%` }}
          />
          <span
            className="bg-amber-400"
            style={{ width: `${(counts.second / denominator) * 100}%` }}
          />
          <span
            className="bg-destructive"
            style={{ width: `${(counts.dnp / denominator) * 100}%` }}
          />
        </div>
        <small className="text-muted-foreground">
          1st {counts.first} · 2nd {counts.second} · DNP {counts.dnp}
        </small>
      </div>
    );
  }

  async function save(target: 'personal' | 'official', data: PickListData) {
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
      const serialized = JSON.stringify(data);
      if (target === 'personal') lastSavedPersonal.current = serialized;
      else lastSavedOfficial.current = serialized;
      let next: PickListsResponse = {
        personal: null,
        official: null,
        consensus: [],
        ballotCount: 0,
        canEditOfficial: false,
        ...response,
        [target]: data,
      };
      if (target === 'personal') {
        const refreshed = await fetch('/api/pick-lists');
        if (refreshed.ok) next = (await refreshed.json()) as PickListsResponse;
      }
      setResponse(next);
      localStorage.setItem(cacheKey, JSON.stringify(next));
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save the pick list.',
      );
    }
  }

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(personal);
    if (serialized === lastSavedPersonal.current) return;
    // Do not create a ballot merely because a scout opened the page. An empty
    // list is saved only when it replaces a previously saved non-empty list.
    if (
      personal.entries.length === 0 &&
      lastSavedPersonal.current === JSON.stringify(emptyPickList)
    )
      return;
    const timeout = window.setTimeout(
      () => void save('personal', personal),
      800,
    );
    return () => window.clearTimeout(timeout);
  }, [hydrated, personal]);

  useEffect(() => {
    if (
      !hydrated ||
      !response?.canEditOfficial ||
      official.entries.length === 0
    )
      return;
    const serialized = JSON.stringify(official);
    if (serialized === lastSavedOfficial.current) return;
    const timeout = window.setTimeout(
      () => void save('official', official),
      800,
    );
    return () => window.clearTimeout(timeout);
  }, [hydrated, official, response?.canEditOfficial]);

  function updateEntry(index: number, patch: Partial<PickListEntry>) {
    setList({
      ...list,
      entries: list.entries.map((entry, item) =>
        item === index ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function addTeam(teamNumber: number) {
    if (list.entries.some((entry) => entry.teamNumber === teamNumber)) return;
    setList({
      ...list,
      entries: [...list.entries, { teamNumber, note: '', tier: 'first' }],
    });
  }

  function removeTeam(teamNumber: number) {
    setList({
      ...list,
      entries: list.entries.filter((entry) => entry.teamNumber !== teamNumber),
    });
  }

  function markTaken(teamNumber: number) {
    if (official.selections.some((item) => item.teamNumber === teamNumber))
      return;
    if (!nextPick) {
      setMessage('Alliance selection is complete.');
      return;
    }
    setOfficial({
      ...official,
      selections: [
        ...official.selections,
        { teamNumber, allianceNumber: nextPick.allianceNumber },
      ],
    });
    setSelectionSearch('');
  }

  function markUnavailable(
    teamNumber: number,
    reason: 'declined' | 'ineligible',
  ) {
    const allianceNumber =
      reason === 'declined' ? nextPick?.allianceNumber : undefined;
    if (reason === 'declined' && !allianceNumber) return;
    setOfficial({
      ...official,
      selections:
        reason === 'ineligible'
          ? official.selections.filter((item) => item.teamNumber !== teamNumber)
          : official.selections,
      unavailable: [
        ...(official.unavailable ?? []).filter(
          (item) =>
            item.teamNumber !== teamNumber ||
            item.reason !== reason ||
            item.allianceNumber !== allianceNumber,
        ),
        { teamNumber, reason, allianceNumber },
      ],
    });
  }

  function undoLastSelection() {
    const last = official.selections.at(-1);
    if (!last) return;
    setOfficial({
      ...official,
      selections: official.selections.slice(0, -1),
    });
  }

  return (
    <Card className="pick-list-print sm:col-span-2 max-md:gap-2 max-md:py-2">
      {standaloneSelection && (
        <CardHeader>
          <CardTitle>Alliance selection</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4 max-md:px-2">
        {!standaloneSelection && (
          <div className="pick-list-controls flex flex-wrap gap-2">
            {response?.canEditOfficial && (
              <Button
                size="sm"
                variant={mode === 'personal' ? 'default' : 'outline'}
                onClick={() => setMode('personal')}
              >
                My pick list
              </Button>
            )}
            {response?.canEditOfficial && (
              <>
                <Button
                  size="sm"
                  variant={mode === 'review' ? 'default' : 'outline'}
                  onClick={() => {
                    setReviewOwnerId(
                      reviewOwnerId || response.ballots?.[0]?.ownerUserId || '',
                    );
                    setMode('review');
                  }}
                >
                  Review scout lists
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'official' ? 'default' : 'outline'}
                  onClick={() => setMode('official')}
                >
                  Team pick list
                </Button>
              </>
            )}
          </div>
        )}

        {mode === 'review' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-semibold" htmlFor="review-pick-list">
                Scout&apos;s pick list
              </label>
              <select
                id="review-pick-list"
                className="h-10 min-w-56 rounded-md border px-3"
                value={reviewOwnerId}
                disabled={!response?.ballots?.length}
                onChange={(event) => setReviewOwnerId(event.target.value)}
              >
                {!response?.ballots?.length && (
                  <option value="">No scout lists yet</option>
                )}
                {(response?.ballots ?? []).map((ballot) => (
                  <option value={ballot.ownerUserId} key={ballot.ownerUserId}>
                    {ballot.ownerName}
                    {ballot.ownerUserId === userId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
              {reviewedBallot?.updatedAt ? (
                <span className="text-xs text-muted-foreground">
                  Updated{' '}
                  {new Date(reviewedBallot.updatedAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              ) : null}
            </div>
            {!reviewedBallot && (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No scouts have saved a personal pick list for this event yet.
              </div>
            )}
            {reviewedBallot && (
              <>
                <div className="pick-list-desktop-editor overflow-x-auto rounded-lg border">
                  <div className="min-w-[620px] divide-y">
                    {reviewedBallot.data.entries.map((entry, index) => {
                      const team = metrics.get(entry.teamNumber);
                      const isDoNotPick = entry.tier === 'do-not-pick';
                      return (
                        <div
                          className={
                            isDoNotPick
                              ? 'grid grid-cols-[54px_90px_90px_90px_120px_1fr] items-center gap-2 bg-destructive/10 p-3 text-destructive'
                              : 'grid grid-cols-[54px_90px_90px_90px_120px_1fr] items-center gap-2 p-3'
                          }
                          key={entry.teamNumber}
                        >
                          <strong>#{index + 1}</strong>
                          <strong>{entry.teamNumber}</strong>
                          <span className="text-sm">
                            xP {team?.xp?.toFixed(1) ?? '—'}
                          </span>
                          <span className="text-sm">
                            OPR {team?.opr?.toFixed(1) ?? '—'}
                          </span>
                          <Badge
                            variant={isDoNotPick ? 'destructive' : 'outline'}
                          >
                            {entry.tier === 'first'
                              ? 'First pick'
                              : entry.tier === 'second'
                                ? 'Second pick'
                                : 'Do not pick'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {entry.note || 'No notes'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pick-list-mobile-editor space-y-2">
                  {reviewedBallot.data.entries.map((entry, index) => {
                    const team = metrics.get(entry.teamNumber);
                    const isDoNotPick = entry.tier === 'do-not-pick';
                    return (
                      <div
                        className={
                          isDoNotPick
                            ? 'rounded-lg border border-destructive/40 bg-destructive/10 p-3'
                            : 'rounded-lg border p-3'
                        }
                        key={entry.teamNumber}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong>
                              #{index + 1} · Team {entry.teamNumber}
                            </strong>
                            <p className="text-xs text-muted-foreground">
                              xP {team?.xp?.toFixed(1) ?? '—'} · OPR{' '}
                              {team?.opr?.toFixed(1) ?? '—'}
                            </p>
                          </div>
                          <Badge
                            variant={isDoNotPick ? 'destructive' : 'outline'}
                          >
                            {isDoNotPick
                              ? 'Do not pick'
                              : entry.tier === 'first'
                                ? 'First pick'
                                : 'Second pick'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {entry.note || 'No notes'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {mode !== 'selection' && mode !== 'review' && (
          <>
            {mode === 'official' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOfficial({
                      entries: (response?.consensus ?? []).map((item) => ({
                        teamNumber: item.teamNumber,
                        note: '',
                        tier: 'first',
                      })),
                      selections: official.selections,
                      unavailable: official.unavailable ?? [],
                    })
                  }
                >
                  Start from consensus
                </Button>
              </div>
            )}
            <div className="grid h-[calc(100dvh-11rem)] min-h-[26rem] grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-2 lg:h-auto lg:min-h-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-none lg:gap-3">
              <section className="flex h-full min-h-0 flex-col rounded-lg border border-l-4 border-l-muted-foreground/35 bg-muted/20 lg:h-[42rem]">
                <div className="border-b bg-muted/60 p-2 sm:p-3">
                  <h3 className="font-semibold">Available Teams</h3>
                  <div className="relative mt-1.5">
                    <Search className="pointer-events-none absolute top-2 left-3 size-4 text-muted-foreground sm:top-2.5" />
                    <Input
                      className="h-8 pl-9 sm:h-9"
                      placeholder="Find a team"
                      value={builderSearch}
                      onChange={(event) => setBuilderSearch(event.target.value)}
                    />
                  </div>
                </div>
                <div className="max-h-[38rem] min-h-0 flex-1 divide-y overflow-y-auto">
                  {teams
                    .filter(
                      (team) =>
                        team.teamNumber !== organizationTeamNumber &&
                        !list.entries.some(
                          (entry) => entry.teamNumber === team.teamNumber,
                        ) &&
                        (!builderSearch.trim() ||
                          String(team.teamNumber).includes(
                            builderSearch.trim(),
                          ) ||
                          team.name
                            ?.toLowerCase()
                            .includes(builderSearch.trim().toLowerCase())),
                    )
                    .sort((a, b) => a.teamNumber - b.teamNumber)
                    .map((team) => (
                      <div
                        className="flex items-center gap-2 p-2"
                        draggable
                        key={team.teamNumber}
                        onDragStart={(event) =>
                          event.dataTransfer.setData(
                            'text/team-number',
                            String(team.teamNumber),
                          )
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <strong>Team {team.teamNumber}</strong>
                          {team.name && (
                            <small className="block truncate text-muted-foreground">
                              {team.name}
                            </small>
                          )}
                          <small className="block text-muted-foreground">
                            xP {team.xp?.toFixed(1) ?? '—'} · OPR{' '}
                            {team.opr?.toFixed(1) ?? '—'}
                          </small>
                          {rankingDistribution(team.teamNumber)}
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`View stats for team ${team.teamNumber}`}
                          onClick={() => setStatsTeam(team.teamNumber)}
                        >
                          <ChartNoAxesColumn />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Add team ${team.teamNumber} to pick list`}
                          onClick={() => addTeam(team.teamNumber)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    ))}
                </div>
              </section>

              <section
                className="flex h-full min-h-0 flex-col rounded-lg border border-primary/40 border-l-4 border-l-primary bg-primary/[0.025] lg:h-[42rem]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const teamNumber = Number(
                    event.dataTransfer.getData('text/team-number'),
                  );
                  if (Number.isInteger(teamNumber)) addTeam(teamNumber);
                }}
              >
                <div className="border-b border-primary/20 bg-primary/10 p-2 sm:p-3">
                  <h3 className="font-semibold text-primary">My Pick List</h3>
                </div>
                <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                  {list.entries.length === 0 && (
                    <div className="grid h-full min-h-48 place-items-center p-6 text-center text-sm text-muted-foreground">
                      Add teams to start building your rankings.
                    </div>
                  )}
                  {list.entries.map((entry, index) => {
                    const team = metrics.get(entry.teamNumber);
                    const isDoNotPick = entry.tier === 'do-not-pick';
                    return (
                      <div
                        key={entry.teamNumber}
                        draggable
                        onDragStart={() => {
                          dragIndex.current = index;
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.stopPropagation();
                          if (dragIndex.current !== null) {
                            setList({
                              ...list,
                              entries: reorder(
                                list.entries,
                                dragIndex.current,
                                index,
                              ),
                            });
                          } else {
                            const teamNumber = Number(
                              event.dataTransfer.getData('text/team-number'),
                            );
                            if (Number.isInteger(teamNumber))
                              addTeam(teamNumber);
                          }
                          dragIndex.current = null;
                        }}
                        className={
                          isDoNotPick
                            ? 'grid grid-cols-[auto_minmax(0,1fr)] gap-2 bg-destructive/10 p-2 text-destructive'
                            : 'grid grid-cols-[auto_minmax(0,1fr)] gap-2 p-2'
                        }
                      >
                        <div className="flex items-start gap-1 pt-1">
                          <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                          <strong className="text-sm">#{index + 1}</strong>
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <div className="min-w-0 flex-1 leading-tight">
                              <strong className="text-sm">
                                Team {entry.teamNumber}
                              </strong>
                              {team?.name && (
                                <small className="block truncate text-muted-foreground">
                                  {team.name}
                                </small>
                              )}
                              {rankingDistribution(entry.teamNumber)}
                            </div>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`View stats for team ${entry.teamNumber}`}
                              onClick={() => setStatsTeam(entry.teamNumber)}
                            >
                              <ChartNoAxesColumn />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Remove team ${entry.teamNumber}`}
                              onClick={() => removeTeam(entry.teamNumber)}
                            >
                              <X />
                            </Button>
                          </div>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <select
                              aria-label={`Pick tier for team ${entry.teamNumber}`}
                              className="h-8 w-[7.25rem] shrink-0 rounded-md border bg-background px-2 text-sm"
                              value={entry.tier}
                              onChange={(event) =>
                                updateEntry(index, {
                                  tier: event.target
                                    .value as PickListEntry['tier'],
                                })
                              }
                            >
                              <option value="first">First pick</option>
                              <option value="second">Second pick</option>
                              <option value="do-not-pick">Do not pick</option>
                            </select>
                            <Input
                              aria-label={`Notes for team ${entry.teamNumber}`}
                              className="h-8 min-w-0 flex-1 px-2"
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
                              aria-label="Move team up"
                              onClick={() =>
                                setList({
                                  ...list,
                                  entries: reorder(
                                    list.entries,
                                    index,
                                    index - 1,
                                  ),
                                })
                              }
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              disabled={index === list.entries.length - 1}
                              aria-label="Move team down"
                              onClick={() =>
                                setList({
                                  ...list,
                                  entries: reorder(
                                    list.entries,
                                    index,
                                    index + 1,
                                  ),
                                })
                              }
                            >
                              <ArrowDown />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </>
        )}

        {mode === 'selection' && (
          <div className="alliance-selection-layout grid min-h-[70vh] gap-3 lg:grid-cols-[19rem_1fr]">
            <aside className="selection-team-pool flex min-h-0 flex-col rounded-lg border bg-muted/30">
              <div className="grid grid-cols-2 border-b">
                <button
                  type="button"
                  className={
                    selectionListMode === 'rankings'
                      ? 'border-b-2 border-primary p-3 font-semibold text-primary'
                      : 'p-3 font-semibold text-muted-foreground'
                  }
                  onClick={() => setSelectionListMode('rankings')}
                >
                  Rankings
                </button>
                <button
                  type="button"
                  className={
                    selectionListMode === 'picklist'
                      ? 'border-b-2 border-primary p-3 font-semibold text-primary'
                      : 'p-3 font-semibold text-muted-foreground'
                  }
                  onClick={() => setSelectionListMode('picklist')}
                >
                  Pick list
                </button>
              </div>
              <div className="relative m-2">
                <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  inputMode="numeric"
                  placeholder="Find a team"
                  value={selectionSearch}
                  onChange={(event) => setSelectionSearch(event.target.value)}
                />
              </div>
              <div className="min-h-0 flex-1 divide-y overflow-y-auto">
                {(selectionListMode === 'picklist'
                  ? official.entries.map((entry, rank) => ({
                      teamNumber: entry.teamNumber,
                      rank,
                      note: entry.note,
                      blocked: entry.tier === 'do-not-pick',
                    }))
                  : [...teams]
                      .sort(
                        (a, b) =>
                          (a.eventRank ?? Number.POSITIVE_INFINITY) -
                            (b.eventRank ?? Number.POSITIVE_INFINITY) ||
                          a.teamNumber - b.teamNumber,
                      )
                      .map((team) => ({
                        teamNumber: team.teamNumber,
                        rank:
                          team.eventRank === null ||
                          team.eventRank === undefined
                            ? null
                            : team.eventRank - 1,
                        note: '',
                        blocked: false,
                      }))
                )
                  .filter(
                    (team) =>
                      !official.selections.some(
                        (item) => item.teamNumber === team.teamNumber,
                      ) &&
                      !(official.unavailable ?? []).some(
                        (item) =>
                          item.teamNumber === team.teamNumber &&
                          (item.reason === 'ineligible' ||
                            (item.reason === 'declined' &&
                              item.allianceNumber ===
                                nextPick?.allianceNumber)),
                      ) &&
                      (!selectionSearch.trim() ||
                        String(team.teamNumber).includes(
                          selectionSearch.trim(),
                        ) ||
                        team.note
                          .toLowerCase()
                          .includes(selectionSearch.trim().toLowerCase())),
                  )
                  .map((team) => (
                    <div
                      className={
                        team.blocked
                          ? 'grid grid-cols-[2rem_1fr_auto] items-center gap-2 bg-destructive/5 px-2 py-2 opacity-60'
                          : 'grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-2 py-2'
                      }
                      key={team.teamNumber}
                    >
                      <span className="text-right text-xs text-muted-foreground">
                        {team.rank === null ? '—' : team.rank + 1}
                      </span>
                      <div className="min-w-0">
                        <strong>{team.teamNumber}</strong>
                        <small className="block truncate text-muted-foreground">
                          xP{' '}
                          {metrics.get(team.teamNumber)?.xp?.toFixed(1) ?? '—'}
                          {' · '}OPR{' '}
                          {metrics.get(team.teamNumber)?.opr?.toFixed(1) ?? '—'}
                        </small>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`View stats for team ${team.teamNumber}`}
                          onClick={() => setStatsTeam(team.teamNumber)}
                        >
                          <ChartNoAxesColumn />
                        </Button>
                        <Button
                          size="sm"
                          disabled={team.blocked}
                          onClick={() => markTaken(team.teamNumber)}
                        >
                          Pick
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Mark team ${team.teamNumber} declined`}
                          onClick={() =>
                            markUnavailable(team.teamNumber, 'declined')
                          }
                        >
                          <UserX />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </aside>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!official.selections.length}
                    onClick={undoLastSelection}
                  >
                    <Undo2 /> Undo
                  </Button>
                </div>
              </div>

              <div className="grid content-start gap-2 md:grid-cols-2">
                {Array.from({ length: 8 }, (_, alliance) => alliance + 1).map(
                  (alliance) => {
                    const selections = official.selections.filter(
                      (item) => item.allianceNumber === alliance,
                    );
                    return (
                      <section
                        className="overflow-hidden rounded-lg border bg-card"
                        key={alliance}
                      >
                        <button
                          type="button"
                          className="w-full border-b bg-muted/60 px-3 py-2 text-center font-semibold"
                        >
                          Alliance {alliance}
                        </button>
                        <div className="grid grid-cols-3 divide-x">
                          {['Captain', 'Pick 1', 'Pick 2'].map(
                            (role, index) => {
                              const selection = selections[index];
                              return (
                                <button
                                  type="button"
                                  className={
                                    nextPick?.allianceNumber === alliance &&
                                    nextPick.pickCount === index
                                      ? 'relative z-10 min-h-20 p-2 text-center outline-3 outline-offset-[-3px] outline-primary hover:bg-muted/50'
                                      : 'min-h-20 p-2 text-center hover:bg-muted/50'
                                  }
                                  onClick={() => {
                                    if (selection)
                                      setOfficial({
                                        ...official,
                                        selections: official.selections.filter(
                                          (item) =>
                                            item.teamNumber !==
                                            selection.teamNumber,
                                        ),
                                      });
                                  }}
                                  title={
                                    selection
                                      ? `Remove Team ${selection.teamNumber}`
                                      : nextPick?.allianceNumber === alliance &&
                                          nextPick.pickCount === index
                                        ? `Next pick: ${role.toLowerCase()} for Alliance ${alliance}`
                                        : `${role} is waiting for its turn`
                                  }
                                  key={role}
                                >
                                  <small className="block uppercase text-muted-foreground">
                                    {role}
                                  </small>
                                  <strong className="mt-2 block text-xl">
                                    {selection?.teamNumber ?? '—'}
                                  </strong>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </section>
                    );
                  },
                )}
              </div>

              <div className="rounded-lg border border-dashed p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Declined invitations</strong>
                  {(official.unavailable ?? []).filter(
                    (item) => item.reason === 'declined',
                  ).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No teams declined.
                    </span>
                  )}
                  {(official.unavailable ?? [])
                    .filter((item) => item.reason === 'declined')
                    .map((item) => (
                      <Button
                        key={`${item.teamNumber}:${item.allianceNumber ?? 'legacy'}`}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOfficial({
                            ...official,
                            unavailable: official.unavailable?.filter(
                              (team) => team !== item,
                            ),
                          })
                        }
                      >
                        Team {item.teamNumber}
                        {item.allianceNumber
                          ? ` declined Alliance ${item.allianceNumber}`
                          : ' declined'}{' '}
                        · undo
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {message && (
          <output className="text-sm text-muted-foreground">{message}</output>
        )}
        <TeamStatsDialog
          teamNumber={statsTeam}
          teamName={statsTeam ? metrics.get(statsTeam)?.name : undefined}
          summary={statsTeam ? metrics.get(statsTeam) : undefined}
          eventSummaries={teams}
          onOpenChange={(open) => {
            if (!open) setStatsTeam(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
