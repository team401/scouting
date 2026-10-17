'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { assignmentClass } from '@/components/event-schedule-board';
import { matchLabel, plannedLabel, type DrivePhase } from '@/lib/drive-team';
import { getCachedValue, saveCachedValue } from '@/lib/offline-db';
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

type ScoutShift = {
  id: string;
  station: string;
  startsAt: number;
  endsAt: number;
};
type ScheduleEntry = {
  id: string;
  role?: EventRole;
  label: string;
  color: string;
  startsAt: number;
  // Null for a single-time entry, such as a match start.
  endsAt: number | null;
};

type PersonalSchedule = { items: Assignment[]; shifts: ScoutShift[] };

function ScheduleRoleBadge({ entry }: { entry: ScheduleEntry }) {
  const [open, setOpen] = useState(false);
  const usesHover = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        onMouseEnter={() => {
          if (usesHover()) setOpen(true);
        }}
        onMouseLeave={() => {
          if (usesHover()) setOpen(false);
        }}
      >
        <PopoverTrigger
          className={`rounded-md px-2.5 py-1 text-left text-sm font-semibold underline decoration-dotted underline-offset-4 ${entry.color}`}
        >
          {entry.label}
        </PopoverTrigger>
        <PopoverContent align="start" className="max-w-72">
          <p className="font-semibold">{entry.role}</p>
          <p className="text-muted-foreground">
            {eventRoleDescription[entry.role!]}
          </p>
        </PopoverContent>
      </div>
    </Popover>
  );
}

type DriveTeamAssignment = {
  phase: DrivePhase;
  slotNumber: number;
  position: string;
  matchNumber: number | null;
  compLevel: string | null;
  startsAt: number | null;
};

export function PersonalEventSchedule({
  name,
  scoutShifts,
  previewUserId,
  eventName,
  actions,
  eventKey,
  userId,
}: {
  name: string;
  scoutShifts: ScoutShift[];
  // Set by an admin previewing the app as a member: shows that member's schedule.
  previewUserId?: string;
  // Used with userId to cache this schedule on the device per event.
  eventKey?: string;
  userId?: string;
  // Event name, with controls (Refresh and last update) at its right.
  eventName?: string;
  actions?: ReactNode;
}) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [previewShifts, setPreviewShifts] = useState<ScoutShift[]>([]);
  const [driveTeam, setDriveTeam] = useState<DriveTeamAssignment[]>([]);
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() =>
    typeof Notification === 'undefined'
      ? 'unsupported'
      : Notification.permission,
  );

  // The schedule is cached per event and user, so it shows at once on return
  // visits. The server response replaces it when it arrives.
  const cacheId =
    eventKey && userId ? `personal-schedule:${eventKey}:${userId}` : null;

  useEffect(() => {
    let cancelled = false;
    let fresh = false;
    const apply = (nextItems: Assignment[], nextShifts: ScoutShift[]) => {
      if (cancelled) return;
      fresh = true;
      setItems(nextItems);
      if (previewUserId) setPreviewShifts(nextShifts);
      if (cacheId)
        void saveCachedValue<PersonalSchedule>(cacheId, {
          items: nextItems,
          shifts: nextShifts,
        }).catch(() => undefined);
    };
    if (cacheId) {
      void getCachedValue<PersonalSchedule>(cacheId)
        .then((cached) => {
          if (!cached || cancelled || fresh) return;
          setItems(cached.items);
          if (previewUserId) setPreviewShifts(cached.shifts);
        })
        .catch(() => undefined);
    }
    if (previewUserId) {
      void Promise.all([
        fetch('/api/event-schedule?all=1'),
        fetch('/api/scout-shifts?all=1'),
      ]).then(async ([rolesResponse, shiftsResponse]) => {
        if (!rolesResponse.ok || !shiftsResponse.ok) return;
        const rolesBody = (await rolesResponse.json()) as {
          assignments?: Assignment[];
        };
        const shiftsBody = (await shiftsResponse.json()) as {
          shifts?: Array<ScoutShift & { scoutUserId: string }>;
        };
        apply(
          (rolesBody.assignments ?? []).filter(
            (item) => item.userId === previewUserId,
          ),
          (shiftsBody.shifts ?? []).filter(
            (shift) => shift.scoutUserId === previewUserId,
          ),
        );
      });
    } else {
      void fetch('/api/event-schedule').then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { assignments?: Assignment[] };
        apply(body.assignments ?? [], []);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [cacheId, previewUserId]);

  useEffect(() => {
    let cancelled = false;
    const query = previewUserId
      ? `?userId=${encodeURIComponent(previewUserId)}`
      : '';
    void fetch(`/api/drive-team${query}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as {
          assignments?: DriveTeamAssignment[];
        };
        if (!cancelled) setDriveTeam(body.assignments ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [previewUserId]);

  useEffect(() => {
    // Reminders are for the signed-in user, not for a previewed member.
    if (permission !== 'granted' || previewUserId) return;
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
  }, [items, permission, previewUserId, scoutShifts]);

  const shifts = previewUserId ? previewShifts : scoutShifts;

  const scheduleDays = useMemo(() => {
    const combined: ScheduleEntry[] = [
      ...items.map((item) => ({
        id: item.id,
        role: item.role,
        label: item.role,
        color: assignmentClass(item.role),
        startsAt: item.startsAt,
        endsAt: item.endsAt,
      })),
      ...shifts.map((shift) => {
        const station = `${shift.station.startsWith('red') ? 'Red' : 'Blue'} ${shift.station.at(-1)}`;
        return {
          id: shift.id,
          role: 'Scouting' as EventRole,
          label: `Scouting · ${station}`,
          color: assignmentClass(station),
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
        };
      }),
      ...driveTeam.flatMap((assignment) =>
        assignment.startsAt === null
          ? []
          : [
              {
                id: `drive:${assignment.slotNumber}:${assignment.position}`,
                label: `${assignment.position} · ${matchLabel(assignment.matchNumber, assignment.compLevel)}`,
                color: assignmentClass('Drive Team'),
                startsAt: assignment.startsAt,
                endsAt: null,
              },
            ],
      ),
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
  }, [items, shifts, driveTeam]);

  // Matches without a time cannot go on the day timeline, so they stay here.
  const untimedDriveTeam = driveTeam.filter((item) => item.startsAt === null);

  const formatTime = (value: number) =>
    new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {eventName && (
                <p className="truncate text-2xl font-semibold">{eventName}</p>
              )}
              <CardTitle>Event schedule for {name}</CardTitle>
            </div>
            {actions}
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {scheduleDays.map(([day, entries]) => (
            <section key={day}>
              <h3 className="pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase first:pt-0">
                {day}
              </h3>
              <div className="divide-y">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    {entry.role ? (
                      <ScheduleRoleBadge entry={entry} />
                    ) : (
                      <span
                        className={`rounded-md px-2.5 py-1 text-sm font-semibold ${entry.color}`}
                      >
                        {entry.label}
                      </span>
                    )}
                    <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                      {entry.endsAt === null
                        ? formatTime(entry.startsAt)
                        : `${formatTime(entry.startsAt)}–${formatTime(entry.endsAt)}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!scheduleDays.length && (
            <p className="text-sm text-muted-foreground">
              Nothing is scheduled yet.
            </p>
          )}
        </CardContent>
      </Card>
      {untimedDriveTeam.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Drive team</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {untimedDriveTeam.map((item) => (
              <div
                key={`${item.slotNumber}:${item.position}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="font-semibold">{item.position}</span>
                <span className="text-sm whitespace-nowrap text-muted-foreground">
                  {item.matchNumber === null
                    ? `${plannedLabel(item.phase, item.slotNumber)} · not released yet`
                    : `${matchLabel(item.matchNumber, item.compLevel)} · time TBA`}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {permission === 'default' && (
        <Card className="border-primary/30 bg-primary/5 py-0">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Role reminders</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Get notified 10 and 5 minutes before each assigned role.
              </p>
            </div>
            <Button
              onClick={() =>
                void Notification.requestPermission().then(setPermission)
              }
            >
              Enable reminders
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
