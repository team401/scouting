'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  eventRoleDescription,
  eventRoles,
  type EventRole,
} from '@/lib/event-roles';

type Assignment = {
  id: string;
  userId: string;
  userName: string;
  role: EventRole;
  startsAt: number;
  endsAt: number;
};

function localInputValue(offsetHours = 0) {
  const date = new Date(Date.now() + offsetHours * 3_600_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function EventRoleScheduler({
  members,
}: {
  members: Array<{ id: string; name: string; disabled?: boolean | number }>;
}) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<EventRole>('Pit Crew');
  const [startsAt, setStartsAt] = useState(() => localInputValue());
  const [endsAt, setEndsAt] = useState(() => localInputValue(1));
  const [message, setMessage] = useState('');
  const [scoutCounts, setScoutCounts] = useState<
    Array<{ userId: string; count: number }>
  >([]);

  const load = useCallback(async () => {
    const response = await fetch('/api/event-schedule?all=1');
    const body = (await response.json()) as {
      assignments?: Assignment[];
      scoutCounts?: Array<{ userId: string; count: number }>;
      error?: string;
    };
    if (!response.ok)
      throw new Error(body.error ?? 'Could not load the event schedule.');
    setItems(body.assignments ?? []);
    setScoutCounts(body.scoutCounts ?? []);
  }, []);

  useEffect(() => {
    void load().catch((error: unknown) =>
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load the event schedule.',
      ),
    );
  }, [load]);

  const counts = useMemo(() => {
    const next = new Map<string, number>();
    for (const item of scoutCounts) next.set(item.userId, Number(item.count));
    for (const item of items)
      next.set(item.userId, (next.get(item.userId) ?? 0) + 1);
    return next;
  }, [items, scoutCounts]);

  async function add() {
    setMessage('');
    const response = await fetch('/api/event-schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId,
        role,
        startsAt: new Date(startsAt).getTime(),
        endsAt: new Date(endsAt).getTime(),
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok)
      return setMessage(body.error ?? 'Could not add the schedule item.');
    setMessage('Schedule item added.');
    await load();
  }

  async function remove(id: string) {
    const response = await fetch(
      `/api/event-schedule?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) return;
    await load();
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Event roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Choose a person</option>
            {members
              .filter((member) => !member.disabled)
              .sort(
                (a, b) =>
                  (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) ||
                  a.name.localeCompare(b.name),
              )
              .map((member) => (
                <option value={member.id} key={member.id}>
                  {member.name} · {counts.get(member.id) ?? 0} assigned
                </option>
              ))}
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3"
            value={role}
            title={eventRoleDescription[role]}
            onChange={(event) => setRole(event.target.value as EventRole)}
          >
            {eventRoles.map(([name, description]) => (
              <option value={name} title={description} key={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
          <input
            className="h-10 rounded-md border bg-background px-3"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
          <Button type="button" disabled={!userId} onClick={() => void add()}>
            Add
          </Button>
        </div>
        <button
          type="button"
          className="text-left text-sm font-semibold underline decoration-dotted underline-offset-4"
          title={eventRoleDescription[role]}
          onClick={() => setMessage(eventRoleDescription[role])}
        >
          What does {role} do?
        </button>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div className="rounded-lg border p-3" key={item.id}>
              <strong>
                {item.userName} · {item.role}
              </strong>
              <p className="text-sm text-muted-foreground">
                {new Date(item.startsAt).toLocaleString([], {
                  weekday: 'short',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                –
                {new Date(item.endsAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={() => void remove(item.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        {message && (
          <p className="text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PersonalEventSchedule({
  name,
  scoutShifts,
}: {
  name: string;
  scoutShifts: Array<{
    id: string;
    station: string;
    startsAt: number;
    endsAt: number;
  }>;
}) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : Notification.permission,
  );

  useEffect(() => {
    void fetch('/api/event-schedule').then(async (response) => {
      if (!response.ok) return;
      const body = (await response.json()) as { assignments?: Assignment[] };
      setItems(body.assignments ?? []);
    });
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;
    const notify = () => {
      const now = Date.now();
      const upcoming = [
        ...items,
        ...scoutShifts.map((shift) => ({
          ...shift,
          role: `${shift.station.toUpperCase()} · Scouting`,
        })),
      ];
      for (const item of upcoming) {
        const minutes = Math.round((item.startsAt - now) / 60_000);
        if (minutes !== 10 && minutes !== 5) continue;
        const key = `event-reminder:${item.id}:${minutes}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        const options = {
          body: new Date(item.startsAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          icon: '/icons/icon-192.png',
        };
        if ('serviceWorker' in navigator)
          void navigator.serviceWorker.ready.then((registration) =>
            registration.showNotification(
              `${item.role} in ${minutes} minutes`,
              options,
            ),
          );
        else new Notification(`${item.role} in ${minutes} minutes`, options);
      }
    };
    notify();
    const timer = window.setInterval(notify, 30_000);
    return () => window.clearInterval(timer);
  }, [items, permission, scoutShifts]);

  const scheduleDays = useMemo(() => {
    const combined = [
      ...items.map((item) => ({
        id: item.id,
        label: item.role,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      })),
      ...scoutShifts.map((shift) => ({
        id: shift.id,
        label: `${shift.station.toUpperCase()} · Scouting`,
        startsAt: shift.startsAt,
        endsAt: shift.endsAt,
      })),
    ].sort((a, b) => a.startsAt - b.startsAt);
    const grouped = new Map<string, typeof combined>();
    for (const item of combined) {
      const key = new Date(item.startsAt).toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [items, scoutShifts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event schedule for {name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {scheduleDays.map(([day, assignments]) => (
          <section className="space-y-2" key={day}>
            <h3 className="pt-2 font-semibold">{day}</h3>
            {assignments.map((item) => (
              <div className="schedule-row" key={item.id}>
                <strong>{item.label}</strong>
                <span>
                  {new Date(item.startsAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  –
                  {new Date(item.endsAt).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </section>
        ))}
        {!scheduleDays.length && (
          <p className="text-sm text-muted-foreground">
            Nothing is scheduled yet.
          </p>
        )}
        {permission === 'default' && (
          <Button
            variant="outline"
            onClick={() =>
              void Notification.requestPermission().then(setPermission)
            }
          >
            Enable 10- and 5-minute reminders
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
