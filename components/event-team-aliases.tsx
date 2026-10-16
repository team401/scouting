'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isOffseasonDemoTeam } from '@/lib/event-team-aliases';

type EventTeam = {
  teamNumber: number;
  name: string;
  customName?: string | null;
};

export function EventTeamAliases({
  eventType,
  teams,
  onChanged,
}: {
  eventType: number | null;
  teams: EventTeam[];
  onChanged: () => void | Promise<void>;
}) {
  const demoTeams = useMemo(
    () =>
      teams.filter((team) => isOffseasonDemoTeam(eventType, team.teamNumber)),
    [eventType, teams],
  );
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingTeam, setSavingTeam] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        demoTeams.map((team) => [team.teamNumber, team.customName ?? '']),
      ),
    );
  }, [demoTeams]);

  if (!demoTeams.length) return null;

  async function save(team: EventTeam) {
    setSavingTeam(team.teamNumber);
    setMessage('');
    try {
      const name = drafts[team.teamNumber]?.trim() || null;
      const response = await fetch('/api/event-team-aliases', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ teamNumber: team.teamNumber, name }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        setMessage(body.error ?? 'Could not save the team name.');
      else {
        setMessage(
          name
            ? `Team ${team.teamNumber} is now ${name} for this event.`
            : `Team ${team.teamNumber} is using its TBA name again.`,
        );
        await onChanged();
      }
    } catch {
      setMessage('Could not save the team name.');
    } finally {
      setSavingTeam(null);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <h3 className="font-semibold">Offseason Teams</h3>
      <div className="grid gap-2 lg:grid-cols-2">
        {demoTeams.map((team) => {
          const value = drafts[team.teamNumber] ?? '';
          const saved = team.customName ?? '';
          return (
            <div
              className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              key={team.teamNumber}
            >
              <strong>Team {team.teamNumber}</strong>
              <Input
                aria-label={`Actual name for Team ${team.teamNumber}`}
                placeholder="Example: Team 401 B"
                value={value}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [team.teamNumber]: event.target.value,
                  }))
                }
              />
              <Button
                type="button"
                variant={value.trim() === saved ? 'outline' : 'default'}
                disabled={savingTeam !== null || value.trim() === saved}
                onClick={() => void save(team)}
              >
                {savingTeam === team.teamNumber ? 'Saving…' : 'Save'}
              </Button>
            </div>
          );
        })}
      </div>
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
