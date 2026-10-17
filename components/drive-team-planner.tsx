'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  canFillDrivePosition,
  defaultPlayoffMatches,
  drivePositionClasses,
  drivePositions,
  matchLabel,
  maxExpectedMatches,
  type DrivePhase,
  type DrivePositionKey,
  type DriveTeamSlotMembers,
} from '@/lib/drive-team';
import { getCachedValue, saveCachedValue } from '@/lib/offline-db';

type PlannerMember = {
  id: string;
  name: string;
  disabled?: boolean | number;
  opsRole?: string | null;
};

type OfficialMatch = {
  matchNumber: number;
  compLevel: string;
  startsAt: number | null;
};

type PlannedSlot = DriveTeamSlotMembers & {
  phase: DrivePhase;
  slotNumber: number;
  official: OfficialMatch | null;
};

const phaseTitle: Record<DrivePhase, string> = {
  qual: 'Quals',
  playoff: 'Playoffs',
};

// Error responses can have empty bodies, so a failed request must not throw a
// parse error.
async function readBody<T extends { error?: string }>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

function matchTime(startsAt: number | null) {
  return startsAt === null
    ? ''
    : ` · ${new Date(startsAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
}

type PersonOption = { id: string; name: string };

// Same behavior as the event role table: a text box that filters as you type,
// with suggestions overlaid above or below the table row.
function DrivePersonInput({
  label,
  hasValue,
  valueName,
  valueClass,
  options,
  disabled,
  onChoose,
}: {
  label: string;
  hasValue: boolean;
  valueName: string;
  valueClass: string;
  options: PersonOption[];
  disabled: boolean;
  onChoose: (id: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? options.filter((option) => option.name.toLowerCase().includes(needle))
    : options;

  function close() {
    setOpen(false);
    setEdited(false);
    setQuery('');
  }

  function choose(id: string | null) {
    close();
    onChoose(id);
  }

  // Enter takes an exact name, else the first suggestion. Leaving the box
  // takes only an exact name or an empty box (which clears the position).
  // Anything else reverts, so a half-typed name never gets saved.
  function commitTyped(takeFirstSuggestion: boolean) {
    if (!edited) return close();
    if (!needle) return choose(null);
    const exact = options.find(
      (option) => option.name.toLowerCase() === needle,
    );
    if (exact) return choose(exact.id);
    const first = takeFirstSuggestion ? matches[0] : undefined;
    if (first) return choose(first.id);
    close();
    return undefined;
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        aria-label={label}
        className={`h-9 w-full min-w-[9rem] rounded-md border px-2 text-center text-sm transition-colors ${hasValue && !open ? `border-transparent font-semibold ${valueClass}` : 'border-slate-300 bg-white text-foreground hover:border-slate-400 hover:bg-slate-50 focus:border-primary dark:border-border dark:bg-background dark:hover:border-muted-foreground dark:hover:bg-muted/40'}`}
        autoComplete="off"
        value={open ? query : valueName}
        disabled={disabled}
        onFocus={() => {
          const input = inputRef.current;
          if (input) {
            const inputRect = input.getBoundingClientRect();
            const scrollRect = input
              .closest('[data-drive-team-scroll]')
              ?.getBoundingClientRect();
            const visibleTop = Math.max(0, scrollRect?.top ?? 0);
            const visibleBottom = Math.min(
              window.innerHeight,
              scrollRect?.bottom ?? window.innerHeight,
            );
            const below = visibleBottom - inputRect.bottom;
            const above = inputRect.top - visibleTop;
            setDropUp(below < 220 && above > below);
          }
          setOpen(true);
          setEdited(false);
          setQuery('');
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setEdited(true);
          setOpen(true);
        }}
        onBlur={() => commitTyped(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitTyped(true);
          } else if (event.key === 'Escape') {
            close();
          }
        }}
      />
      {open && (
        <div
          className={`absolute left-0 z-50 max-h-48 min-w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {hasValue && !needle && (
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(null)}
            >
              Clear assignment
            </button>
          )}
          {matches.map((option) => (
            <button
              type="button"
              className="block w-full whitespace-nowrap rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.id)}
              key={option.id}
            >
              {option.name}
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No matching person
            </p>
          )}
        </div>
      )}
    </div>
  );
}

type DrivePlannerCache = {
  slots: PlannedSlot[];
  publishedAt: number | null;
  hasUnpublishedChanges: boolean;
};

export function DriveTeamPlanner({
  members,
  eventKey,
}: {
  members: PlannerMember[];
  eventKey: string;
}) {
  const [slots, setSlots] = useState<PlannedSlot[]>([]);
  const [expectedInput, setExpectedInput] = useState('');
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);
  const [cacheReady, setCacheReady] = useState(false);
  const cacheId = eventKey ? `drive-team-planner:${eventKey}` : null;

  const applyCache = useCallback((cached: DrivePlannerCache) => {
    setSlots(cached.slots);
    setExpectedInput(
      cached.slots.some((slot) => slot.phase === 'qual')
        ? String(cached.slots.filter((slot) => slot.phase === 'qual').length)
        : '',
    );
    setPublishedAt(cached.publishedAt);
    setHasUnpublishedChanges(cached.hasUnpublishedChanges);
  }, []);

  const activeMembers = useMemo(
    () =>
      members
        .filter((member) => !member.disabled)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const load = useCallback(async () => {
    const [planResponse, publishResponse] = await Promise.all([
      fetch('/api/drive-team?all=1'),
      fetch('/api/drive-team-publish'),
    ]);
    const planBody = await readBody<{
      slots?: PlannedSlot[];
      error?: string;
    }>(planResponse);
    const publishBody = await readBody<{
      publishedAt?: number | null;
      hasUnpublishedChanges?: boolean;
      error?: string;
    }>(publishResponse);
    if (!planResponse.ok)
      throw new Error(planBody.error ?? 'Could not load drive teams.');
    if (!publishResponse.ok)
      throw new Error(
        publishBody.error ?? 'Could not load drive team publication.',
      );
    const loadedSlots = planBody.slots ?? [];
    const loaded: DrivePlannerCache = {
      slots: loadedSlots,
      publishedAt: publishBody.publishedAt ?? null,
      hasUnpublishedChanges: publishBody.hasUnpublishedChanges ?? false,
    };
    applyCache(loaded);
    if (cacheId) await saveCachedValue(cacheId, loaded);
    setCacheReady(true);
  }, [applyCache, cacheId]);

  useEffect(() => {
    let cancelled = false;
    setCacheReady(false);
    void (async () => {
      if (cacheId) {
        const cached = await getCachedValue<DrivePlannerCache>(cacheId).catch(
          () => undefined,
        );
        if (cached && !cancelled) applyCache(cached);
      }
      if (cancelled) return;
      setCacheReady(true);
      await load();
    })().catch((error: unknown) => {
      if (!cancelled)
        setMessage(
          error instanceof Error
            ? error.message
            : 'Could not load drive teams.',
        );
    });
    return () => {
      cancelled = true;
    };
  }, [applyCache, cacheId, load]);

  useEffect(() => {
    if (!cacheReady || !cacheId) return;
    void saveCachedValue<DrivePlannerCache>(cacheId, {
      slots,
      publishedAt,
      hasUnpublishedChanges,
    }).catch(() => undefined);
  }, [cacheId, cacheReady, hasUnpublishedChanges, publishedAt, slots]);

  // A picker lists people who can fill that position. The current person stays
  // listed so an existing assignment never shows as blank.
  function pickerOptions(
    key: DrivePositionKey,
    currentId: string | null,
  ): PersonOption[] {
    return activeMembers
      .filter(
        (member) =>
          member.id === currentId || canFillDrivePosition(key, member.opsRole),
      )
      .map((member) => ({ id: member.id, name: member.name }));
  }

  function memberName(id: string | null) {
    if (!id) return '';
    return members.find((member) => member.id === id)?.name ?? '';
  }

  async function saveSlot(next: PlannedSlot) {
    const previous = slots;
    setSlots((current) =>
      current.map((slot) =>
        slot.phase === next.phase && slot.slotNumber === next.slotNumber
          ? next
          : slot,
      ),
    );
    setMessage('');
    const response = await fetch('/api/drive-team', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        phase: next.phase,
        slotNumber: next.slotNumber,
        driverUserId: next.driverUserId,
        operatorUserId: next.operatorUserId,
        humanPlayerUserId: next.humanPlayerUserId,
        technicianUserId: next.technicianUserId,
        coachUserId: next.coachUserId,
      }),
    });
    const body = await readBody<{ error?: string }>(response);
    if (!response.ok) {
      setSlots(previous);
      setMessage(body.error ?? 'Could not save this planned match.');
      return;
    }
    setHasUnpublishedChanges(true);
  }

  async function setExpectedMatches() {
    const count = Number(expectedInput);
    if (!Number.isInteger(count) || count < 1 || count > maxExpectedMatches) {
      setMessage(`Choose between 1 and ${maxExpectedMatches} matches.`);
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/drive-team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phase: 'qual', expectedMatches: count }),
    });
    const body = await readBody<{ error?: string }>(response);
    if (!response.ok) {
      setBusy(false);
      setMessage(body.error ?? 'Could not set the expected matches.');
      return;
    }
    await load();
    setBusy(false);
    setMessage(`Planning ${count} qualification matches.`);
  }

  async function publishDriveTeams() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/drive-team-publish', { method: 'POST' });
    const body = await readBody<{
      publishedAt?: number;
      hasUnpublishedChanges?: boolean;
      error?: string;
    }>(response);
    setBusy(false);
    if (!response.ok || !body.publishedAt) {
      setMessage(body.error ?? 'Could not publish drive teams.');
      return;
    }
    setPublishedAt(body.publishedAt);
    setHasUnpublishedChanges(false);
    setMessage('Drive teams published to the team.');
  }

  async function unpublishDriveTeams() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/drive-team-publish', {
      method: 'DELETE',
    });
    const body = await readBody<{ error?: string }>(response);
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error ?? 'Could not unpublish drive teams.');
      return false;
    }
    setPublishedAt(null);
    setHasUnpublishedChanges(true);
    setMessage('Drive teams unpublished. Your plan is still saved.');
    return true;
  }

  function renderSection(phase: DrivePhase) {
    const phaseSlots = slots.filter((slot) => slot.phase === phase);
    return (
      <section className="space-y-2" key={phase}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">{phaseTitle[phase]}</h3>
          {phase === 'qual' ? (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Expected matches
                <input
                  aria-label="Expected qualification matches"
                  className="h-9 w-24 rounded-md border bg-background px-2 text-center text-sm tabular-nums"
                  type="number"
                  min={1}
                  max={maxExpectedMatches}
                  inputMode="numeric"
                  value={expectedInput}
                  onChange={(event) => setExpectedInput(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setExpectedMatches()}
              >
                Set count
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {defaultPlayoffMatches} planned matches
            </p>
          )}
        </div>

        {phaseSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {phase === 'playoff'
              ? 'Preparing playoff matches…'
              : 'Set the expected qualification matches to create rows.'}
          </p>
        ) : (
          <div
            className="overflow-x-auto rounded-lg border border-slate-300 bg-slate-100 dark:border-border dark:bg-background"
            data-drive-team-scroll
          >
            <table className="w-full min-w-[60rem] border-separate border-spacing-0 text-sm">
              <thead className="bg-slate-200 dark:bg-muted">
                <tr>
                  <th className="border-r border-b border-slate-300 px-3 py-2 text-center dark:border-border">
                    Match
                  </th>
                  {drivePositions.map((position) => (
                    <th
                      className="border-r border-b border-slate-300 px-3 py-2 text-center dark:border-border"
                      key={position.key}
                    >
                      {position.label}
                    </th>
                  ))}
                  <th className="border-b border-slate-300 px-3 py-2 text-center dark:border-border">
                    Official match
                  </th>
                </tr>
              </thead>
              <tbody>
                {phaseSlots.map((slot, rowIndex) => (
                  <tr
                    className={
                      rowIndex % 2
                        ? 'bg-slate-100 dark:bg-[color-mix(in_srgb,var(--muted)_20%,var(--background))]'
                        : 'bg-white dark:bg-background'
                    }
                    key={`${slot.phase}:${slot.slotNumber}`}
                  >
                    <th className="border-r border-b border-slate-300 bg-inherit px-3 py-2 text-center align-middle font-medium tabular-nums dark:border-border">
                      {phase === 'playoff'
                        ? `Playoff ${slot.slotNumber}`
                        : slot.slotNumber}
                    </th>
                    {drivePositions.map((position) => (
                      <td
                        className="border-r border-b border-slate-300 px-2 py-1 align-middle dark:border-border"
                        key={position.key}
                      >
                        <DrivePersonInput
                          label={`${position.label}, ${phaseTitle[phase]} ${slot.slotNumber}`}
                          hasValue={slot[position.key] !== null}
                          valueName={memberName(slot[position.key])}
                          valueClass={drivePositionClasses[position.key]}
                          options={pickerOptions(
                            position.key,
                            slot[position.key],
                          )}
                          disabled={busy}
                          onChoose={(id) =>
                            void saveSlot({ ...slot, [position.key]: id })
                          }
                        />
                      </td>
                    ))}
                    <td className="border-b border-slate-300 bg-inherit px-3 py-2 text-center align-middle whitespace-nowrap text-muted-foreground tabular-nums dark:border-border">
                      {slot.official
                        ? `${matchLabel(slot.official.matchNumber, slot.official.compLevel)}${matchTime(slot.official.startsAt)}`
                        : 'Not released yet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Drive Team</CardTitle>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <p className="text-right text-xs text-muted-foreground">
            {publishedAt
              ? hasUnpublishedChanges
                ? 'Unpublished changes'
                : `Published ${new Date(publishedAt).toLocaleString()}`
              : 'Not published yet'}
          </p>
          {publishedAt && (
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => setUnpublishConfirmOpen(true)}
            >
              Unpublish
            </Button>
          )}
          <Button
            type="button"
            disabled={busy || (publishedAt !== null && !hasUnpublishedChanges)}
            onClick={() => void publishDriveTeams()}
          >
            {busy
              ? 'Working…'
              : publishedAt
                ? 'Publish drive team changes'
                : 'Publish drive teams'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}

        {renderSection('qual')}
        {renderSection('playoff')}
      </CardContent>
      <ConfirmActionDialog
        open={unpublishConfirmOpen}
        onOpenChange={setUnpublishConfirmOpen}
        title="Unpublish drive teams?"
        description="Drive teams will stop appearing for team members. Your plan is kept so you can edit and publish it again."
        confirmLabel="Unpublish drive teams"
        destructive
        onConfirm={unpublishDriveTeams}
      />
    </Card>
  );
}
