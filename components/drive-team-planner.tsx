'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  canFillDrivePosition,
  drivePositions,
  matchLabel,
  maxExpectedMatches,
  type DrivePhase,
  type DrivePositionKey,
  type DriveTeamSlotMembers,
} from '@/lib/drive-team';

type PlannerMember = {
  id: string;
  name: string;
  disabled?: boolean | number;
  opsRole?: string | null;
};

type PlannedSlot = DriveTeamSlotMembers & {
  phase: DrivePhase;
  slotNumber: number;
  matchId: string | null;
};

type OfficialMatch = {
  id: string;
  matchNumber: number;
  compLevel: string;
  scheduledAt: number | null;
  predictedAt: number | null;
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

function matchTime(match: OfficialMatch) {
  const time = match.predictedAt ?? match.scheduledAt;
  return time === null
    ? ''
    : ` · ${new Date(time).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`;
}

const selectClass =
  'h-9 min-w-0 rounded-md border bg-background px-2 text-sm !w-full';

export function DriveTeamPlanner({ members }: { members: PlannerMember[] }) {
  const [slots, setSlots] = useState<PlannedSlot[]>([]);
  const [matches, setMatches] = useState<OfficialMatch[]>([]);
  const [expectedInput, setExpectedInput] = useState<
    Record<DrivePhase, string>
  >({ qual: '', playoff: '' });
  const [startMatchInput, setStartMatchInput] = useState('1');
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);

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
      matches?: OfficialMatch[];
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
    setSlots(loadedSlots);
    setMatches(planBody.matches ?? []);
    setExpectedInput({
      qual: loadedSlots.some((slot) => slot.phase === 'qual')
        ? String(loadedSlots.filter((slot) => slot.phase === 'qual').length)
        : '',
      playoff: loadedSlots.some((slot) => slot.phase === 'playoff')
        ? String(loadedSlots.filter((slot) => slot.phase === 'playoff').length)
        : '',
    });
    setPublishedAt(publishBody.publishedAt ?? null);
    setHasUnpublishedChanges(publishBody.hasUnpublishedChanges ?? false);
  }, []);

  useEffect(() => {
    load().catch((error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : 'Could not load drive teams.',
      ),
    );
  }, [load]);

  // A picker lists people who can fill that position. The current person stays
  // listed so an existing assignment never shows as blank.
  function pickerOptions(key: DrivePositionKey, currentId: string | null) {
    return activeMembers.filter(
      (member) =>
        member.id === currentId || canFillDrivePosition(key, member.opsRole),
    );
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
        matchId: next.matchId,
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

  async function setExpectedMatches(phase: DrivePhase) {
    const count = Number(expectedInput[phase]);
    if (!Number.isInteger(count) || count < 1 || count > maxExpectedMatches) {
      setMessage(`Choose between 1 and ${maxExpectedMatches} matches.`);
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/drive-team', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phase, expectedMatches: count }),
    });
    const body = await readBody<{ error?: string }>(response);
    if (!response.ok) {
      setBusy(false);
      setMessage(body.error ?? 'Could not set the expected matches.');
      return;
    }
    await load();
    setBusy(false);
    setMessage(
      `Planning ${count} ${phase === 'playoff' ? 'playoff' : 'qualification'} matches.`,
    );
  }

  async function mapToOfficialMatches() {
    const start = Number(startMatchInput);
    if (!Number.isInteger(start) || start < 1) {
      setMessage('Choose the first qualification match number.');
      return;
    }
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/drive-team', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ startMatchNumber: start }),
    });
    const body = await readBody<{
      mapped?: number;
      unmatched?: number;
      error?: string;
    }>(response);
    if (!response.ok) {
      setBusy(false);
      setMessage(body.error ?? 'Could not map the matches.');
      return;
    }
    await load();
    setBusy(false);
    setMessage(
      `Mapped ${body.mapped ?? 0} planned matches. ${body.unmatched ?? 0} not released yet.`,
    );
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
    const officialMatches = matches.filter((match) =>
      phase === 'qual' ? match.compLevel === 'qm' : match.compLevel !== 'qm',
    );
    const emptyLabel = phase === 'playoff' ? 'Anyone' : 'Unassigned';
    return (
      <section className="space-y-3" key={phase}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-semibold">{phaseTitle[phase]}</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-end gap-2">
              <label className="grid gap-1 text-sm font-medium">
                Expected matches
                <input
                  aria-label={`Expected ${phaseTitle[phase]} matches`}
                  className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
                  type="number"
                  min={1}
                  max={maxExpectedMatches}
                  inputMode="numeric"
                  value={expectedInput[phase]}
                  onChange={(event) =>
                    setExpectedInput((current) => ({
                      ...current,
                      [phase]: event.target.value,
                    }))
                  }
                />
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void setExpectedMatches(phase)}
              >
                Set count
              </Button>
            </div>
            {phase === 'qual' && (
              <div className="flex items-end gap-2">
                <label className="grid gap-1 text-sm font-medium">
                  First qualification match
                  <input
                    aria-label="First qualification match"
                    className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={startMatchInput}
                    onChange={(event) => setStartMatchInput(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || phaseSlots.length === 0}
                  onClick={() => void mapToOfficialMatches()}
                >
                  Map to schedule
                </Button>
              </div>
            )}
          </div>
        </div>

        {phaseSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Set the expected {phase === 'playoff' ? 'playoff' : 'qualification'}{' '}
            matches to create rows.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[60rem] border-separate border-spacing-0 text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Match</th>
                  {drivePositions.map((position) => (
                    <th
                      className="border-b px-3 py-2 text-left"
                      key={position.key}
                    >
                      {position.label}
                    </th>
                  ))}
                  <th className="border-b px-3 py-2 text-left">
                    Official match
                  </th>
                </tr>
              </thead>
              <tbody>
                {phaseSlots.map((slot) => (
                  <tr key={`${slot.phase}:${slot.slotNumber}`}>
                    <th className="border-b px-3 py-2 text-left font-medium">
                      {phase === 'playoff'
                        ? `Playoff ${slot.slotNumber}`
                        : slot.slotNumber}
                    </th>
                    {drivePositions.map((position) => (
                      <td className="border-b px-2 py-1" key={position.key}>
                        <select
                          aria-label={`${position.label}, ${phaseTitle[phase]} ${slot.slotNumber}`}
                          className={selectClass}
                          value={slot[position.key] ?? ''}
                          disabled={busy}
                          onChange={(event) =>
                            void saveSlot({
                              ...slot,
                              [position.key]: event.target.value || null,
                            })
                          }
                        >
                          <option value="">{emptyLabel}</option>
                          {pickerOptions(position.key, slot[position.key]).map(
                            (member) => (
                              <option value={member.id} key={member.id}>
                                {member.name}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                    ))}
                    <td className="border-b px-2 py-1">
                      <select
                        aria-label={`Official match for ${phaseTitle[phase]} ${slot.slotNumber}`}
                        className={selectClass}
                        value={slot.matchId ?? ''}
                        disabled={busy}
                        onChange={(event) =>
                          void saveSlot({
                            ...slot,
                            matchId: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Not released yet</option>
                        {officialMatches.map((match) => (
                          <option value={match.id} key={match.id}>
                            {matchLabel(match.matchNumber, match.compLevel)}
                            {matchTime(match)}
                          </option>
                        ))}
                      </select>
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
      <CardHeader>
        <CardTitle>Drive team schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-prose text-sm text-muted-foreground">
            Plan drive teams before the event releases its schedule. Match
            numbers map onto these planned matches once qualification matches
            are released. This publishes separately from the shift schedule.
          </p>
          <div className="ml-auto flex items-start gap-2">
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
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                disabled={
                  busy || (publishedAt !== null && !hasUnpublishedChanges)
                }
                onClick={() => void publishDriveTeams()}
              >
                {busy
                  ? 'Working…'
                  : publishedAt
                    ? 'Publish drive team changes'
                    : 'Publish drive teams'}
              </Button>
              <p className="text-right text-xs text-muted-foreground">
                {publishedAt
                  ? hasUnpublishedChanges
                    ? 'Unpublished changes'
                    : `Published ${new Date(publishedAt).toLocaleString()}`
                  : 'Not published yet'}
              </p>
            </div>
          </div>
        </div>

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
