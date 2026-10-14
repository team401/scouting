'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  Eye,
  GripVertical,
  Printer,
  RotateCcw,
  Save,
  Search,
  Undo2,
  UserX,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  emptyPickList,
  nextAllianceAfterSelection,
  nextAllianceSlot,
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
  ballots?: Array<{
    ownerUserId: string;
    ownerName: string;
    updatedAt: number;
    data: PickListData;
  }>;
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
    unavailable: [],
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
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [allianceNumber, setAllianceNumber] = useState(1);
  const [selectionSearch, setSelectionSearch] = useState('');
  const [selectionListMode, setSelectionListMode] = useState<
    'rankings' | 'picklist'
  >('picklist');
  const dragIndex = useRef<number | null>(null);
  const cacheKey = `pick-lists:${eventKey}:${userId}`;
  const draftKey = `pick-lists-draft:${eventKey}:${userId}`;

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
    const previousPickCount = official.selections.filter(
      (item) => item.allianceNumber === allianceNumber,
    ).length;
    if (previousPickCount >= 3) {
      setMessage(`Alliance ${allianceNumber} is already complete.`);
      return;
    }
    setOfficial({
      ...official,
      selections: [...official.selections, { teamNumber, allianceNumber }],
    });
    setAllianceNumber(
      nextAllianceAfterSelection(allianceNumber, previousPickCount),
    );
    setSelectionSearch('');
  }

  function markUnavailable(
    teamNumber: number,
    reason: 'declined' | 'ineligible',
  ) {
    setOfficial({
      ...official,
      selections: official.selections.filter(
        (item) => item.teamNumber !== teamNumber,
      ),
      unavailable: [
        ...(official.unavailable ?? []).filter(
          (item) => item.teamNumber !== teamNumber,
        ),
        { teamNumber, reason },
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
    setAllianceNumber(last.allianceNumber);
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

  return (
    <Card className="pick-list-print sm:col-span-2">
      <CardHeader>
        <div>
          <CardTitle>
            {response?.canEditOfficial
              ? 'Pick lists and alliance selection'
              : 'My pick list'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {response?.canEditOfficial
              ? 'Personal ballots feed consensus; the definitive list drives the live selection board.'
              : 'Rank teams and keep notes on your own pick list.'}
          </p>
        </div>
        {response?.canEditOfficial && (
          <Badge variant="outline">{response.ballotCount} ballots</Badge>
        )}
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
          {response?.canEditOfficial && (
            <>
              <Button
                size="sm"
                variant={mode === 'review' ? 'default' : 'outline'}
                disabled={!response.ballots?.length}
                onClick={() => {
                  setReviewOwnerId(
                    reviewOwnerId || response.ballots?.[0]?.ownerUserId || '',
                  );
                  setMode('review');
                }}
              >
                <Eye /> Review lists
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
            </>
          )}
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

        {mode === 'review' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="font-semibold" htmlFor="review-pick-list">
                Scout
              </label>
              <select
                id="review-pick-list"
                className="h-10 min-w-56 rounded-md border px-3"
                value={reviewOwnerId}
                onChange={(event) => setReviewOwnerId(event.target.value)}
              >
                {(response?.ballots ?? []).map((ballot) => (
                  <option value={ballot.ownerUserId} key={ballot.ownerUserId}>
                    {ballot.ownerName}
                  </option>
                ))}
              </select>
              {response?.ballots?.find(
                (ballot) => ballot.ownerUserId === reviewOwnerId,
              )?.updatedAt ? (
                <span className="text-xs text-muted-foreground">
                  Updated{' '}
                  {new Date(
                    response.ballots.find(
                      (ballot) => ballot.ownerUserId === reviewOwnerId,
                    )!.updatedAt,
                  ).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              ) : null}
            </div>
            <div className="pick-list-desktop-editor overflow-x-auto rounded-lg border">
              <div className="min-w-[620px] divide-y">
                {(response?.ballots ?? [])
                  .find((ballot) => ballot.ownerUserId === reviewOwnerId)
                  ?.data.entries.map((entry, index) => {
                    const team = metrics.get(entry.teamNumber);
                    const isDoNotPick =
                      entry.tier === 'do-not-pick' || entry.avoid;
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
                          EPA {team?.epa?.toFixed(1) ?? '—'}
                        </span>
                        <span className="text-sm">
                          OPR {team?.opr?.toFixed(1) ?? '—'}
                        </span>
                        <Badge variant={isDoNotPick ? 'destructive' : 'outline'}>
                          {entry.tier === 'first' && !entry.avoid
                              ? 'First pick'
                              : entry.tier === 'second' && !entry.avoid
                                ? 'Second pick'
                                : 'Do not pick'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.note || 'No notes'}
                        </span>
                      </div>
                    );
                  }) ?? null}
              </div>
            </div>
            <div className="pick-list-mobile-editor space-y-2">
              {list.entries.map((entry, index) => {
                const team = metrics.get(entry.teamNumber);
                const isDoNotPick =
                  entry.tier === 'do-not-pick' || entry.avoid;
                return (
                  <div
                    className={
                      isDoNotPick
                        ? 'rounded-lg border border-destructive/40 bg-destructive/10 p-3'
                        : 'rounded-lg border p-3'
                    }
                    key={entry.teamNumber}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <strong>#{index + 1} · Team {entry.teamNumber}</strong>
                        <p className="text-xs text-muted-foreground">
                          EPA {team?.epa?.toFixed(1) ?? '—'} · OPR{' '}
                          {team?.opr?.toFixed(1) ?? '—'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Move Team ${entry.teamNumber} up`}
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
                          variant="outline"
                          aria-label={`Move Team ${entry.teamNumber} down`}
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
                    <div className="mt-2 grid gap-2">
                      <select
                        aria-label={`Pick tier for Team ${entry.teamNumber}`}
                        className="h-10 w-full rounded-md border bg-transparent px-2"
                        value={isDoNotPick ? 'do-not-pick' : entry.tier}
                        onChange={(event) =>
                          updateEntry(index, {
                            tier: event.target.value as PickListEntry['tier'],
                            avoid: false,
                          })
                        }
                      >
                        <option value="first">First pick</option>
                        <option value="second">Second pick</option>
                        <option value="do-not-pick">Do not pick</option>
                      </select>
                      <input
                        aria-label={`Notes for team ${entry.teamNumber}`}
                        className="h-10 w-full rounded-md border bg-transparent px-2"
                        placeholder="Notes"
                        value={entry.note}
                        onChange={(event) =>
                          updateEntry(index, { note: event.target.value })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mode !== 'selection' && mode !== 'review' && (
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
                      unavailable: official.unavailable ?? [],
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
                  const isDoNotPick =
                    entry.tier === 'do-not-pick' || entry.avoid;
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
                        isDoNotPick
                          ? 'grid grid-cols-[36px_54px_90px_80px_80px_120px_1fr] items-center gap-2 bg-destructive/10 p-2 text-destructive'
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
                          value={isDoNotPick ? 'do-not-pick' : entry.tier}
                          onChange={(event) =>
                            updateEntry(index, {
                              tier: event.target.value as PickListEntry['tier'],
                              avoid: false,
                            })
                          }
                        >
                          <option value="first">First pick</option>
                          <option value="second">Second pick</option>
                          <option value="do-not-pick">Do not pick</option>
                        </select>
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
                      blocked: entry.avoid || entry.tier === 'do-not-pick',
                    }))
                  : [...teams]
                      .sort(
                        (a, b) =>
                          (b.epa ?? b.medianPoints) -
                          (a.epa ?? a.medianPoints),
                      )
                      .map((team, rank) => ({
                        teamNumber: team.teamNumber,
                        rank,
                        note: '',
                        blocked: false,
                      })))
                  .filter(
                    (team) =>
                      !official.selections.some(
                        (item) => item.teamNumber === team.teamNumber,
                      ) &&
                      !(official.unavailable ?? []).some(
                        (item) => item.teamNumber === team.teamNumber,
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
                        {team.rank + 1}
                      </span>
                      <div className="min-w-0">
                        <strong>{team.teamNumber}</strong>
                        <small className="block truncate text-muted-foreground">
                          EPA{' '}
                          {metrics.get(team.teamNumber)?.epa?.toFixed(1) ?? '—'}
                          {' · '}OPR{' '}
                          {metrics.get(team.teamNumber)?.opr?.toFixed(1) ?? '—'}
                        </small>
                      </div>
                      <div className="flex gap-1">
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-primary px-4 py-3 text-primary-foreground">
                <strong>
                  Select {nextAllianceSlot(
                    official.selections.filter(
                      (item) => item.allianceNumber === allianceNumber,
                    ).length,
                  ).toLowerCase()}{' '}
                  for Alliance {allianceNumber}
                </strong>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!official.selections.length}
                    onClick={undoLastSelection}
                  >
                    <Undo2 /> Undo
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => void save('official', official)}
                  >
                    <Save /> {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="grid flex-1 content-between gap-3 md:grid-cols-2">
                {Array.from({ length: 8 }, (_, alliance) => alliance + 1).map(
                  (alliance) => {
                    const selections = official.selections.filter(
                      (item) => item.allianceNumber === alliance,
                    );
                    return (
                      <section
                        className={
                          alliance === allianceNumber
                            ? 'overflow-hidden rounded-lg border-2 border-primary bg-card'
                            : 'overflow-hidden rounded-lg border bg-card'
                        }
                        key={alliance}
                      >
                        <button
                          type="button"
                          className="w-full border-b bg-muted/60 px-3 py-2 text-center font-semibold"
                          onClick={() => setAllianceNumber(alliance)}
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
                                  className="min-h-20 p-2 text-center hover:bg-muted/50"
                                  onClick={() => {
                                    setAllianceNumber(alliance);
                                    if (selection)
                                      setOfficial({
                                        ...official,
                                        selections:
                                          official.selections.filter(
                                            (item) =>
                                              item.teamNumber !==
                                              selection.teamNumber,
                                          ),
                                      });
                                  }}
                                  title={
                                    selection
                                      ? `Remove Team ${selection.teamNumber}`
                                      : `Select ${role.toLowerCase()}`
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
                  <strong>Declined pool</strong>
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
                        key={item.teamNumber}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOfficial({
                            ...official,
                            unavailable: official.unavailable?.filter(
                              (team) => team.teamNumber !== item.teamNumber,
                            ),
                          })
                        }
                      >
                        {item.teamNumber} · restore
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
      </CardContent>
    </Card>
  );
}
