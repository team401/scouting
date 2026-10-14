'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const stations = ['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3'] as const;
type Station = (typeof stations)[number];
type Shift = {
  id: string;
  station: Station;
  scoutUserId: string;
  scoutName: string;
  startsAt: number;
  endsAt: number;
};

function localInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const defaultShiftStart = new Date();
defaultShiftStart.setMinutes(0, 0, 0);
defaultShiftStart.setHours(defaultShiftStart.getHours() + 1);
const defaultShiftEnd = new Date(defaultShiftStart.getTime() + 60 * 60_000);

export function ShiftScheduler({
  members,
  matches,
  onChanged,
}: {
  members: Array<{ id: string; name: string; disabled?: number | boolean }>;
  matches: Array<{
    key: string;
    label: string;
    scheduledAt: number | null;
    predictedAt: number | null;
  }>;
  onChanged: () => void | Promise<void>;
}) {
  const [startsAt, setStartsAt] = useState(localInput(defaultShiftStart));
  const [endsAt, setEndsAt] = useState(localInput(defaultShiftEnd));
  const [assignments, setAssignments] = useState<Record<Station, string>>({
    red1: '',
    red2: '',
    red3: '',
    blue1: '',
    blue2: '',
    blue3: '',
  });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const initializedFromSchedule = useRef(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/scout-shifts');
    const result = (await response.json()) as {
      shifts?: Shift[];
      error?: string;
    };
    if (!response.ok) throw new Error(result.error ?? 'Could not load shifts.');
    setShifts(result.shifts ?? []);
  }, []);

  useEffect(() => {
    if (initializedFromSchedule.current) return;
    const firstTime = matches
      .map((match) => match.predictedAt ?? match.scheduledAt)
      .filter((time): time is number => time !== null)
      .sort((a, b) => a - b)[0];
    if (!firstTime) return;
    initializedFromSchedule.current = true;
    const start = new Date(firstTime);
    start.setMinutes(0, 0, 0);
    setStartsAt(localInput(start));
    setEndsAt(localInput(new Date(start.getTime() + 60 * 60_000)));
  }, [matches]);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load().catch((error: unknown) =>
        setMessage(
          error instanceof Error ? error.message : 'Could not load shifts.',
        ),
      );
    }, 0);
    return () => window.clearTimeout(initial);
  }, [load]);

  const blocks = useMemo(() => {
    const grouped = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const key = `${shift.startsAt}:${shift.endsAt}`;
      grouped.set(key, [...(grouped.get(key) ?? []), shift]);
    }
    return [...grouped.values()];
  }, [shifts]);
  const coveredMatches = useMemo(() => {
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    return matches.filter((match) => {
      const time = match.predictedAt ?? match.scheduledAt;
      return time !== null && time >= start && time < end;
    });
  }, [endsAt, matches, startsAt]);

  function setDuration(minutes: number) {
    const start = new Date(startsAt).getTime();
    if (!Number.isFinite(start)) return;
    setEndsAt(localInput(new Date(start + minutes * 60_000)));
  }

  function continueBlock(block: Shift[]) {
    const nextAssignments = { ...assignments };
    for (const station of stations)
      nextAssignments[station] =
        block.find((shift) => shift.station === station)?.scoutUserId ?? '';
    const duration = block[0].endsAt - block[0].startsAt;
    setAssignments(nextAssignments);
    setStartsAt(localInput(new Date(block[0].endsAt)));
    setEndsAt(localInput(new Date(block[0].endsAt + duration)));
    setMessage('Lineup copied into the next time block.');
  }

  async function createBlock() {
    setMessage('');
    const selected = stations
      .map((station) => ({ station, scoutUserId: assignments[station] }))
      .filter((item) => item.scoutUserId);
    if (!selected.length) {
      setMessage('Assign at least one station before saving the shift.');
      return;
    }
    if (
      new Set(selected.map((item) => item.scoutUserId)).size !== selected.length
    ) {
      setMessage('Each station needs a different scout.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/scout-shifts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          startsAt: new Date(startsAt).getTime(),
          endsAt: new Date(endsAt).getTime(),
          assignments: selected,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? 'Could not save shift.');
      setMessage('Shift saved and future match assignments updated.');
      const start = new Date(startsAt).getTime();
      const end = new Date(endsAt).getTime();
      const duration = end - start;
      setStartsAt(localInput(new Date(end)));
      setEndsAt(localInput(new Date(end + duration)));
      await load();
      await onChanged();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not save shift.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlock(id: string) {
    setBusy(true);
    const response = await fetch(
      `/api/scout-shifts?id=${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      },
    );
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? 'Could not delete shift.');
      return;
    }
    setMessage('Shift removed and future assignments updated.');
    await load();
    await onChanged();
  }

  const available = members.filter((member) => !member.disabled);
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Time-based scout shifts</CardTitle>
        <Badge variant="outline">{blocks.length} blocks</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Each selected scout covers that station for every match whose
          predicted time is inside this window. You can leave stations open and
          add them later. Manual per-match changes remain overrides.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm" htmlFor="shift-start">
            <span>Starts</span>
            <Input
              id="shift-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm" htmlFor="shift-end">
            <span>Ends</span>
            <Input
              id="shift-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Duration:</span>
          {[30, 60, 90, 120].map((minutes) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDuration(minutes)}
              key={minutes}
            >
              {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
            </Button>
          ))}
          <Badge variant="secondary">
            {coveredMatches.length
              ? `${coveredMatches[0].label}–${coveredMatches.at(-1)?.label} · ${coveredMatches.length} matches`
              : 'No scheduled matches in this block'}
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <label
              className="grid gap-1 rounded-lg border p-2 text-sm"
              key={station}
            >
              <strong
                className={
                  station.startsWith('red') ? 'text-red-600' : 'text-blue-600'
                }
              >
                {station.toUpperCase()}
              </strong>
              <select
                className="h-10 rounded-md border bg-background px-2"
                value={assignments[station]}
                onChange={(event) =>
                  setAssignments({
                    ...assignments,
                    [station]: event.target.value,
                  })
                }
              >
                <option value="">Choose scout</option>
                {available.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <Button
          onClick={() => void createBlock()}
          disabled={busy || coveredMatches.length === 0}
        >
          <Plus /> {busy ? 'Saving…' : 'Add shift block'}
        </Button>
        <div className="space-y-2">
          {blocks.map((block) => (
            <div
              className="rounded-lg border p-3"
              key={`${block[0].startsAt}:${block[0].endsAt}`}
            >
              <div className="flex items-center justify-between gap-2">
                <strong>
                  {new Date(block[0].startsAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' – '}
                  {new Date(block[0].endsAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => continueBlock(block)}
                  >
                    <Copy /> Continue lineup
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete shift block"
                    disabled={busy}
                    onClick={() => void deleteBlock(block[0].id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3 lg:grid-cols-6">
                {stations.map((station) => {
                  const shift = block.find((item) => item.station === station);
                  return (
                    <span key={station}>
                      <strong>{station.toUpperCase()}</strong>{' '}
                      {shift?.scoutName ?? 'Open'}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {!blocks.length && (
            <p className="text-sm text-muted-foreground">
              No time-based shifts configured.
            </p>
          )}
        </div>
        {message && (
          <output className="block text-sm text-muted-foreground">
            {message}
          </output>
        )}
      </CardContent>
    </Card>
  );
}
