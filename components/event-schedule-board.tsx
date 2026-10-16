'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import {
  activeCoverageTargets,
  coverageCount,
  roleEnabled,
  summarizeShifts,
  type EventControls,
} from '@/lib/event-coverage';
import { eventRoles, type EventRole } from '@/lib/event-roles';
import { getCachedValue, saveCachedValue } from '@/lib/offline-db';

const stations = ['red1', 'red2', 'red3', 'blue1', 'blue2', 'blue3'] as const;
type Station = (typeof stations)[number];
type Member = {
  id: string;
  name: string;
  role: string;
  opsRole?: string | null;
  disabled?: boolean | number;
};
type ScheduleMember = Member & {
  scheduleRowKey: string;
  guestSlot?: number;
};
type RoleItem = {
  id: string;
  userId: string;
  userName: string;
  role: EventRole;
  startsAt: number;
  endsAt: number;
};
type ScoutItem = {
  id: string;
  scoutUserId: string;
  scoutName: string;
  station: Station;
  startsAt: number;
  endsAt: number;
};
type ScheduleItem = {
  id: string;
  userId: string;
  label: string;
  startsAt: number;
  endsAt: number;
  kind: 'role' | 'scouting';
};
type ScheduleDay = {
  date: string;
  startHour: number;
  endHour: number;
  scoutingEnabled?: boolean | number;
  outreachEnabled?: boolean | number;
};
type ScheduleCache = {
  roles: RoleItem[];
  scouting: ScoutItem[];
  days: ScheduleDay[];
  attendeeIds: string[];
};

function scheduleCacheId(eventKey: string) {
  return `event-schedule-board:${eventKey}`;
}

function dateInputValue(value: number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

// Error responses can have empty bodies (for example a 500 after a dropped
// database connection), so a failed request must not throw a parse error.
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

function slotTime(dateValue: string, hour: number) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day, hour).getTime();
}

function daysFromAssignments(
  assignments: Array<{ startsAt: number; endsAt: number }>,
) {
  const grouped = new Map<string, ScheduleDay>();
  for (const assignment of assignments) {
    const date = dateInputValue(assignment.startsAt);
    const start = new Date(assignment.startsAt);
    const end = new Date(assignment.endsAt);
    const startHour = start.getHours();
    const endHour = Math.min(
      24,
      end.getHours() + (end.getMinutes() || end.getSeconds() ? 1 : 0),
    );
    const current = grouped.get(date);
    grouped.set(date, {
      date,
      startHour: Math.min(current?.startHour ?? startHour, startHour),
      endHour: Math.max(current?.endHour ?? endHour, endHour),
    });
  }
  return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function displayStation(station: Station) {
  return `${station.startsWith('red') ? 'Red' : 'Blue'} ${station.at(-1)}`;
}

type ScheduleOption = { label: string; value: string };

const allScheduleOptions: ScheduleOption[] = [
  ...stations.map((station) => ({
    label: displayStation(station),
    value: `station:${station}`,
  })),
  ...eventRoles.map(([role]) => ({ label: role, value: `role:${role}` })),
];

// Only stations and roles the event has turned on are offered anywhere.
function scheduleOptionsFor(controls: EventControls): ScheduleOption[] {
  return allScheduleOptions.filter((option) =>
    option.value.startsWith('station:')
      ? controls.scoutingEnabled
      : roleEnabled(option.label, controls),
  );
}

function scheduleValue(label: string, options: ScheduleOption[]) {
  return options.find(
    (option) => option.label.toLowerCase() === label.trim().toLowerCase(),
  )?.value;
}

function isGuestMember(member: Member) {
  // Guests sign in with a guest pass; their user IDs carry the guest: prefix.
  return member.id.startsWith('guest:');
}

function canSchedule(member: Member) {
  return !member.disabled && member.opsRole !== 'coach';
}

function scheduleMemberName(member: ScheduleMember) {
  return member.guestSlot === undefined
    ? member.name
    : `${member.name} · Scout ${member.guestSlot + 1}`;
}

export function assignmentClass(label: string) {
  if (label.startsWith('Red'))
    return 'bg-red-200 text-red-950 dark:bg-red-950 dark:text-red-100';
  if (label.startsWith('Blue'))
    return 'bg-blue-200 text-blue-950 dark:bg-blue-950 dark:text-blue-100';
  const roleColors: Partial<Record<EventRole, string>> = {
    Inspection:
      'bg-yellow-200 text-yellow-950 dark:bg-yellow-900 dark:text-yellow-100',
    Calibration:
      'bg-indigo-200 text-indigo-950 dark:bg-indigo-900 dark:text-indigo-100',
    'Drive Team': 'bg-purple-600 text-white dark:bg-purple-800',
    'Pit Lead': 'bg-amber-600 text-white dark:bg-amber-800',
    'Pit Crew':
      'bg-orange-300 text-orange-950 dark:bg-orange-900 dark:text-orange-100',
    'Pit Programmer':
      'bg-cyan-200 text-cyan-950 dark:bg-cyan-900 dark:text-cyan-100',
    'Pit Outreach':
      'bg-lime-200 text-lime-950 dark:bg-lime-900 dark:text-lime-100',
    'Scouting Lead': 'bg-emerald-600 text-white dark:bg-emerald-800',
    Scouting:
      'bg-green-200 text-green-950 dark:bg-green-900 dark:text-green-100',
    'Pit Scouting':
      'bg-teal-200 text-teal-950 dark:bg-teal-900 dark:text-teal-100',
    'Alliance Rep': 'bg-rose-600 text-white dark:bg-rose-800',
    'Team Media': 'bg-sky-600 text-white dark:bg-sky-800',
    'Spirit Lead':
      'bg-pink-300 text-pink-950 dark:bg-pink-900 dark:text-pink-100',
  };
  if (roleColors[label as EventRole]) return roleColors[label as EventRole]!;
  return 'bg-primary/15 text-foreground';
}

function matchingOptions(query: string, options: ScheduleOption[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options
    .filter((option) => option.label.toLowerCase().includes(normalized))
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(normalized) ? 0 : 1;
      return aStarts - bStarts || a.label.localeCompare(b.label);
    });
}

function invalidRoleMessage(text: string) {
  return `“${text}” is not a recognized role or station.`;
}

function ScheduleRoleInput({
  label,
  busy,
  ariaLabel,
  choices,
  onCommit,
  onRangePaste,
  onInvalid,
  onNavigate,
  cellId,
  onAdvance,
}: {
  label: string;
  busy: boolean;
  ariaLabel: string;
  choices: ScheduleOption[];
  onCommit: (value: string) => void;
  onRangePaste: (text: string) => void;
  onInvalid: (text: string) => void;
  onNavigate: (rowDelta: number, columnDelta: number) => void;
  cellId: string;
  onAdvance: () => void;
}) {
  const [query, setQuery] = useState(label);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  // Set only when the user types or pastes into this cell. Focusing a cell never
  // overwrites its value, and clicking out saves only intentional edits.
  const editedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = matchingOptions(query, choices);

  useEffect(() => {
    if (!open) setQuery(label);
  }, [label, open]);

  function choose(optionLabel: string) {
    editedRef.current = false;
    const value = optionLabel ? scheduleValue(optionLabel, choices) : '';
    if (optionLabel && !value) return;
    setQuery(optionLabel);
    setOpen(false);
    if (optionLabel !== label) onCommit(value ?? '');
  }

  // Blur accepts only an exact role/station name. Enter also accepts the first
  // suggestion. Anything else is rejected and the cell reverts.
  function commitTyped(allowSuggestion: boolean) {
    const typed = query.trim();
    if (!typed) return choose('');
    const exact = choices.find(
      (option) => option.label.toLowerCase() === typed.toLowerCase(),
    );
    const target =
      exact?.label ?? (allowSuggestion ? options[0]?.label : undefined);
    if (target) choose(target);
    else onInvalid(typed);
  }

  return (
    <div className="relative h-9">
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        autoComplete="off"
        className={`h-9 w-full rounded-md border px-1 text-center text-xs font-medium ${label && !open ? assignmentClass(label) : 'bg-background text-foreground'}`}
        disabled={busy}
        data-schedule-cell={cellId}
        value={busy ? 'Saving…' : query}
        onChange={(event) => {
          editedRef.current = true;
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          const input = inputRef.current;
          if (input) {
            const inputRect = input.getBoundingClientRect();
            const scrollRect = input
              .closest('[data-schedule-scroll]')
              ?.getBoundingClientRect();
            const visibleTop = Math.max(0, scrollRect?.top ?? 0);
            const visibleBottom = Math.min(
              window.innerHeight,
              scrollRect?.bottom ?? window.innerHeight,
            );
            const below = visibleBottom - inputRect.bottom;
            const above = inputRect.top - visibleTop;
            setDropUp(below < 260 && above > below);
          }
          editedRef.current = false;
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => {
          if (editedRef.current) commitTyped(false);
          editedRef.current = false;
          window.setTimeout(() => {
            setOpen(false);
            setQuery(label);
          }, 100);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (editedRef.current) commitTyped(true);
            editedRef.current = false;
            event.currentTarget.blur();
            window.setTimeout(onAdvance, 0);
          } else if (event.key === 'Escape') {
            editedRef.current = false;
            setQuery(label);
            setOpen(false);
            event.currentTarget.blur();
          } else if (
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            const { selectionStart, selectionEnd } = event.currentTarget;
            const atStart = selectionStart === 0 && selectionEnd === 0;
            const atEnd =
              selectionStart === query.length && selectionEnd === query.length;
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              onNavigate(-1, 0);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              onNavigate(1, 0);
            } else if (event.key === 'ArrowLeft' && atStart) {
              event.preventDefault();
              onNavigate(0, -1);
            } else if (event.key === 'ArrowRight' && atEnd) {
              event.preventDefault();
              onNavigate(0, 1);
            }
          }
        }}
        onCopy={(event) => {
          if (query || !label) return;
          event.preventDefault();
          event.clipboardData.setData('text/plain', label);
        }}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text');
          if (!/[\t\r\n]/.test(text)) return;
          event.preventDefault();
          onRangePaste(text);
        }}
      />
      {open && (
        <div
          className={`absolute left-0 z-50 max-h-64 min-w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {query === '' && label && (
            <button
              type="button"
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose('')}
            >
              Clear assignment
            </button>
          )}
          {options.map((option, index) => (
            <button
              type="button"
              className={`mt-1 block w-full whitespace-nowrap rounded-md px-2 py-1.5 text-left text-xs font-medium ${assignmentClass(option.label)} ${index === 0 ? 'ring-2 ring-primary ring-inset' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.label)}
              key={option.value}
            >
              {option.label}
            </button>
          ))}
          {!options.length && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No matching role
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EventScheduleBoard({
  members,
  eventKey,
  onChanged,
  eventPicker,
}: {
  members: Member[];
  eventKey: string;
  onChanged: () => void | Promise<void>;
  eventPicker: ReactNode;
}) {
  const [date, setDate] = useState(() => dateInputValue(Date.now()));
  const [startHour, setStartHour] = useState(7);
  const [endHour, setEndHour] = useState(18);
  const [scheduleDays, setScheduleDays] = useState<ScheduleDay[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [scouting, setScouting] = useState<ScoutItem[]>([]);
  const [message, setMessage] = useState('');
  const [busyCell, setBusyCell] = useState('');
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set());
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterMessage, setRosterMessage] = useState('');
  const [publishedAt, setPublishedAt] = useState<number | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);
  const attendanceDirtyRef = useRef(false);
  const freshLoadedRef = useRef(false);
  const [controls, setControls] = useState<EventControls>({
    scoutingEnabled: true,
    outreachEnabled: true,
  });
  const [defaultControls, setDefaultControls] = useState<EventControls>({
    scoutingEnabled: true,
    outreachEnabled: true,
  });

  async function changeControls(next: EventControls) {
    const previous = controls;
    setControls(next);
    const day = scheduleDays.find((item) => item.date === date);
    if (!day) return;
    try {
      const response = await fetch('/api/event-schedule-days', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          startHour,
          endHour,
          ...next,
        }),
      });
      if (!response.ok) {
        const body = await readBody<{ error?: string }>(response);
        throw new Error(body.error ?? 'Could not save day settings.');
      }
      setScheduleDays((current) =>
        current.map((item) =>
          item.date === date ? { ...item, ...next } : item,
        ),
      );
    } catch (error) {
      setControls(previous);
      setMessage(
        error instanceof Error ? error.message : 'Could not save day settings.',
      );
    }
  }

  const load = useCallback(async () => {
    const [
      rolesResponse,
      shiftsResponse,
      attendanceResponse,
      daysResponse,
      controlsResponse,
      publicationResponse,
    ] = await Promise.all([
      fetch('/api/event-schedule?all=1'),
      fetch('/api/scout-shifts?all=1'),
      fetch('/api/event-attendees'),
      fetch('/api/event-schedule-days'),
      fetch('/api/event-controls'),
      fetch('/api/event-schedule-publish'),
    ]);
    const rolesBody = await readBody<{
      assignments?: RoleItem[];
      error?: string;
    }>(rolesResponse);
    const shiftsBody = await readBody<{
      shifts?: ScoutItem[];
      error?: string;
    }>(shiftsResponse);
    const attendanceBody = await readBody<{
      userIds?: string[];
      configured?: boolean;
      error?: string;
    }>(attendanceResponse);
    const daysBody = await readBody<{
      days?: ScheduleDay[];
      error?: string;
    }>(daysResponse);
    const controlsBody = await readBody<
      Partial<EventControls> & { error?: string }
    >(controlsResponse);
    const publicationBody = await readBody<{
      publishedAt?: number | null;
      hasUnpublishedChanges?: boolean;
      error?: string;
    }>(publicationResponse);
    if (!rolesResponse.ok)
      throw new Error(rolesBody.error ?? 'Could not load event roles.');
    if (!shiftsResponse.ok)
      throw new Error(shiftsBody.error ?? 'Could not load scouting shifts.');
    if (!attendanceResponse.ok)
      throw new Error(
        attendanceBody.error ?? 'Could not load event attendance.',
      );
    if (!daysResponse.ok)
      throw new Error(daysBody.error ?? 'Could not load event days.');
    if (!controlsResponse.ok)
      throw new Error(controlsBody.error ?? 'Could not load event controls.');
    if (!publicationResponse.ok)
      throw new Error(
        publicationBody.error ?? 'Could not load publication status.',
      );
    setPublishedAt(publicationBody.publishedAt ?? null);
    setHasUnpublishedChanges(publicationBody.hasUnpublishedChanges ?? false);
    const loadedDefaults = {
      scoutingEnabled: controlsBody.scoutingEnabled ?? true,
      outreachEnabled: controlsBody.outreachEnabled ?? true,
    };
    setDefaultControls(loadedDefaults);
    const loadedRoles = rolesBody.assignments ?? [];
    const loadedShifts = shiftsBody.shifts ?? [];
    setRoles(loadedRoles);
    setScouting(loadedShifts);
    const loadedAttendeeIds = attendanceBody.configured
      ? (attendanceBody.userIds ?? []).filter((id) =>
          members.some((member) => member.id === id && canSchedule(member)),
        )
      : [];
    if (!attendanceDirtyRef.current) setAttendeeIds(new Set(loadedAttendeeIds));
    setAttendanceLoaded(true);
    const configuredDays = daysBody.days ?? [];
    const days = configuredDays.length
      ? configuredDays
      : daysFromAssignments([...loadedRoles, ...loadedShifts]);
    setScheduleDays(days);
    if (days.length) {
      const selected = days.find((day) => day.date === date) ?? days[0];
      setDate(selected.date);
      setStartHour(selected.startHour);
      setEndHour(selected.endHour);
      setControls({
        scoutingEnabled: Boolean(
          selected.scoutingEnabled ?? loadedDefaults.scoutingEnabled,
        ),
        outreachEnabled: Boolean(
          selected.outreachEnabled ?? loadedDefaults.outreachEnabled,
        ),
      });
    } else {
      setControls(loadedDefaults);
    }
    freshLoadedRef.current = true;
    if (eventKey)
      void saveCachedValue<ScheduleCache>(scheduleCacheId(eventKey), {
        roles: loadedRoles,
        scouting: loadedShifts,
        days,
        attendeeIds: loadedAttendeeIds,
      }).catch(() => undefined);
  }, [eventKey, members]);

  // Show the last schedule saved on this device right away, so the board is not
  // blank while the server responds. The fresh load replaces it once it arrives.
  useEffect(() => {
    if (!eventKey) return;
    let cancelled = false;
    void getCachedValue<ScheduleCache>(scheduleCacheId(eventKey))
      .then((cached) => {
        if (!cached || cancelled || freshLoadedRef.current) return;
        setRoles(cached.roles);
        setScouting(cached.scouting);
        if (!attendanceDirtyRef.current)
          setAttendeeIds(new Set(cached.attendeeIds));
        setAttendanceLoaded(true);
        setScheduleDays(cached.days);
        const today = dateInputValue(Date.now());
        const selected =
          cached.days.find((day) => day.date === today) ?? cached.days[0];
        if (selected) {
          setDate(selected.date);
          setStartHour(selected.startHour);
          setEndHour(selected.endHour);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [eventKey]);

  useEffect(() => {
    const showError = (error: unknown) =>
      setMessage(
        error instanceof Error ? error.message : 'Could not load the schedule.',
      );
    // One quiet retry covers a transient connection drop before showing an error.
    void load().catch(() => {
      window.setTimeout(() => void load().catch(showError), 1500);
    });
  }, [load]);

  const items = useMemo<ScheduleItem[]>(
    () => [
      ...roles.map((item) => ({
        id: item.id,
        userId: item.userId,
        label: item.role,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        kind: 'role' as const,
      })),
      ...scouting.map((item) => ({
        id: item.id,
        userId: item.scoutUserId,
        label: displayStation(item.station),
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        kind: 'scouting' as const,
      })),
    ],
    [roles, scouting],
  );
  const activeMembers = useMemo(
    () =>
      members
        .filter((member) => canSchedule(member) && attendeeIds.has(member.id))
        .sort(
          (a, b) =>
            Number(isGuestMember(a)) - Number(isGuestMember(b)) ||
            a.name.localeCompare(b.name),
        )
        .flatMap<ScheduleMember>((member) =>
          isGuestMember(member)
            ? Array.from({ length: 3 }, (_, guestSlot) => ({
                ...member,
                guestSlot,
                scheduleRowKey: `${member.id}:${guestSlot}`,
              }))
            : [{ ...member, scheduleRowKey: member.id }],
        ),
    [attendeeIds, members],
  );
  const hours = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, endHour - startHour) },
        (_, index) => startHour + index,
      ),
    [endHour, startHour],
  );
  const dayStart = slotTime(date, 0);
  const dayEnd = slotTime(date, 24);
  const shiftCounts = useMemo(() => {
    const byUser = new Map<string, ScheduleItem[]>();
    for (const item of items)
      if (item.startsAt < dayEnd && item.endsAt > dayStart)
        byUser.set(item.userId, [...(byUser.get(item.userId) ?? []), item]);
    return new Map(
      [...byUser].map(([userId, list]) => [userId, summarizeShifts(list)]),
    );
  }, [dayEnd, dayStart, items]);
  const emptyShifts = { scouting: 0, pit: 0, total: 0 };
  const choices = useMemo(() => scheduleOptionsFor(controls), [controls]);
  const choiceChars = Math.max(
    10,
    ...choices.map((option) => option.label.length),
  );
  const hourColumnWidth = `calc(${choiceChars}ch + 1.5rem)`;
  const nameChars = Math.max(
    0,
    ...activeMembers.map(
      (member) =>
        scheduleMemberName(member).length + (isGuestMember(member) ? 8 : 0),
    ),
  );
  const coverageTargets = useMemo(
    () => activeCoverageTargets(controls),
    [controls],
  );
  // Items covering each displayed hour; drives the coverage footer.
  const hourItems = useMemo(
    () =>
      hours.map((hour) => {
        const startsAt = slotTime(date, hour);
        return items.filter(
          (item) => item.startsAt <= startsAt && item.endsAt > startsAt,
        );
      }),
    [date, hours, items],
  );
  const coverageGrid = useMemo(
    () =>
      coverageTargets.map((target) => ({
        target,
        counts: hourItems.map((list) => coverageCount(target, list)),
      })),
    [coverageTargets, hourItems],
  );

  async function changeCell(
    member: ScheduleMember,
    hour: number,
    value: string,
  ) {
    const startsAt = slotTime(date, hour);
    const endsAt = startsAt + 60 * 60_000;
    const memberItems = items
      .filter(
        (item) =>
          item.userId === member.id &&
          item.startsAt <= startsAt &&
          item.endsAt > startsAt,
      )
      .sort((a, b) => a.label.localeCompare(b.label));
    const existing = memberItems[member.guestSlot ?? 0];
    const key = `${member.scheduleRowKey}:${startsAt}`;
    setBusyCell(key);
    setMessage('');
    try {
      if (existing) {
        const endpoint =
          existing.kind === 'scouting'
            ? '/api/scout-shifts'
            : '/api/event-schedule';
        const response = await fetch(
          `${endpoint}?id=${encodeURIComponent(existing.id)}`,
          { method: 'DELETE' },
        );
        const body = await readBody<{ error?: string }>(response);
        if (!response.ok)
          throw new Error(body.error ?? 'Could not remove this assignment.');
        if (existing.kind === 'scouting')
          setScouting((current) =>
            current.filter((item) => item.id !== existing.id),
          );
        else
          setRoles((current) =>
            current.filter((item) => item.id !== existing.id),
          );
      }
      if (!value) {
        void onChanged();
        setHasUnpublishedChanges(true);
        return;
      }
      if (value.startsWith('station:')) {
        const station = value.slice('station:'.length) as Station;
        const response = await fetch('/api/scout-shifts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            date,
            startsAt,
            endsAt,
            assignments: [{ station, scoutUserId: member.id }],
          }),
        });
        const body = (await response.json()) as {
          error?: string;
          shifts?: ScoutItem[];
        };
        if (!response.ok)
          throw new Error(
            body.error ?? 'Could not add the scouting assignment.',
          );
        const created = body.shifts?.[0];
        if (created)
          setScouting((current) => [
            ...current,
            { ...created, scoutName: member.name },
          ]);
      } else {
        const role = value.slice('role:'.length) as EventRole;
        const response = await fetch('/api/event-schedule', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            date,
            userId: member.id,
            role,
            startsAt,
            endsAt,
          }),
        });
        const body = (await response.json()) as {
          error?: string;
          assignment?: RoleItem;
        };
        if (!response.ok)
          throw new Error(body.error ?? 'Could not add the event role.');
        if (body.assignment)
          setRoles((current) => [
            ...current,
            { ...body.assignment!, userName: member.name },
          ]);
      }
      void onChanged();
      setHasUnpublishedChanges(true);
    } catch (error) {
      await load().catch(() => undefined);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not update the schedule.',
      );
    } finally {
      setBusyCell('');
    }
  }

  async function pasteCells(
    startRow: number,
    startColumn: number,
    text: string,
  ) {
    const rows = text
      .trimEnd()
      .split(/\r?\n/)
      .map((row) => row.split('\t'));
    for (let rowOffset = 0; rowOffset < rows.length; rowOffset += 1) {
      const member = activeMembers[startRow + rowOffset];
      if (!member) break;
      for (
        let columnOffset = 0;
        columnOffset < rows[rowOffset].length;
        columnOffset += 1
      ) {
        const hour = hours[startColumn + columnOffset];
        if (hour === undefined) break;
        const label = rows[rowOffset][columnOffset].trim();
        const value = label ? scheduleValue(label, choices) : '';
        if (label && !value) {
          setMessage(invalidRoleMessage(label));
          return;
        }
        await changeCell(member, hour, value ?? '');
      }
    }
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    if (
      rowIndex < 0 ||
      columnIndex < 0 ||
      rowIndex >= activeMembers.length ||
      columnIndex >= hours.length
    )
      return;
    document
      .querySelector<HTMLInputElement>(
        `[data-schedule-cell="${columnIndex}:${rowIndex}"]`,
      )
      ?.focus();
  }

  async function saveAttendance() {
    setRosterMessage('');
    const response = await fetch('/api/event-attendees', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userIds: [...attendeeIds] }),
    });
    const body = (await response.json()) as {
      error?: string;
      userIds?: string[];
    };
    if (!response.ok)
      return setRosterMessage(body.error ?? 'Could not save event attendance.');
    attendanceDirtyRef.current = false;
    setAttendeeIds(new Set(body.userIds ?? []));
    setRosterMessage('Saved');
    setRosterOpen(false);
    await onChanged();
  }

  function selectScheduleDay(day: ScheduleDay) {
    setDate(day.date);
    setStartHour(day.startHour);
    setEndHour(day.endHour);
    setControls({
      scoutingEnabled: Boolean(
        day.scoutingEnabled ?? defaultControls.scoutingEnabled,
      ),
      outreachEnabled: Boolean(
        day.outreachEnabled ?? defaultControls.outreachEnabled,
      ),
    });
  }

  async function saveScheduleDay() {
    setMessage('');
    const response = await fetch('/api/event-schedule-days', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date, startHour, endHour, ...controls }),
    });
    const body = (await response.json()) as {
      day?: ScheduleDay;
      error?: string;
    };
    if (!response.ok || !body.day) {
      setMessage(body.error ?? 'Could not save this event day.');
      return;
    }
    setScheduleDays((current) =>
      [...current.filter((day) => day.date !== body.day!.date), body.day!].sort(
        (a, b) => a.date.localeCompare(b.date),
      ),
    );
    setMessage('Event day saved.');
  }

  async function publishSchedule() {
    setPublishing(true);
    setMessage('');
    const response = await fetch('/api/event-schedule-publish', {
      method: 'POST',
    });
    const body = await readBody<{
      publishedAt?: number;
      hasUnpublishedChanges?: boolean;
      error?: string;
    }>(response);
    setPublishing(false);
    if (!response.ok || !body.publishedAt) {
      setMessage(body.error ?? 'Could not publish the schedule.');
      return;
    }
    setPublishedAt(body.publishedAt);
    setHasUnpublishedChanges(false);
    setMessage('Shifts published to the team.');
    await onChanged();
  }

  async function unpublishSchedule() {
    setPublishing(true);
    setMessage('');
    const response = await fetch('/api/event-schedule-publish', {
      method: 'DELETE',
    });
    const body = await readBody<{ error?: string }>(response);
    setPublishing(false);
    if (!response.ok) {
      setMessage(body.error ?? 'Could not unpublish the schedule.');
      return false;
    }
    setPublishedAt(null);
    setHasUnpublishedChanges(true);
    setMessage('Shifts unpublished. Your draft is still available.');
    await onChanged();
  }

  async function removeScheduleDay(day: string) {
    setMessage('');
    const response = await fetch(
      `/api/event-schedule-days?date=${encodeURIComponent(day)}`,
      { method: 'DELETE' },
    );
    const body = await readBody<{ error?: string }>(response);
    if (!response.ok) {
      setMessage(body.error ?? 'Could not remove this event day.');
      return;
    }
    const remaining = scheduleDays.filter((item) => item.date !== day);
    setScheduleDays(remaining);
    if (remaining.length) selectScheduleDay(remaining[0]);
    setMessage('Event day removed. Existing assignments were preserved.');
  }

  // Update day is needed only when the displayed hours differ from the saved window.
  const savedDay = scheduleDays.find((day) => day.date === date);
  const hoursChanged =
    savedDay !== undefined &&
    (savedDay.startHour !== startHour || savedDay.endHour !== endHour);

  return (
    <>
      <Card className="mb-4 gap-0 overflow-hidden py-0">
        <CardContent className="space-y-3 py-(--card-spacing)">
          {eventPicker}
        </CardContent>
        <details
          className="group border-t"
          open={rosterOpen}
          onToggle={(event) => setRosterOpen(event.currentTarget.open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-(--card-spacing) py-3 font-semibold transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
            <span>
              Event Roster · {activeMembers.length}{' '}
              {activeMembers.length === 1 ? 'person' : 'people'}
            </span>
            {rosterMessage && (
              <span className="font-normal text-muted-foreground">
                {rosterMessage}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 text-sm font-normal text-muted-foreground">
              {rosterOpen ? 'Hide' : 'Show'}
              <ChevronDown
                className="size-5 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </span>
          </summary>
          <div className="px-(--card-spacing) pb-(--card-spacing)">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  attendanceDirtyRef.current = true;
                  setAttendeeIds(
                    new Set(
                      members.filter(canSchedule).map((member) => member.id),
                    ),
                  );
                }}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  attendanceDirtyRef.current = true;
                  setAttendeeIds(new Set());
                }}
              >
                Clear
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members
                .filter(canSchedule)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((member) => {
                  const checked =
                    attendanceLoaded && attendeeIds.has(member.id);
                  return (
                    <label
                      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${checked ? 'border-primary/50 bg-primary/10' : 'hover:bg-muted/60'}`}
                      key={member.id}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          setAttendeeIds((current) => {
                            attendanceDirtyRef.current = true;
                            const next = new Set(current);
                            if (nextChecked) next.add(member.id);
                            else next.delete(member.id);
                            return next;
                          })
                        }
                      />
                      <span>{member.name}</span>
                    </label>
                  );
                })}
            </div>
            <Button
              className="mt-3"
              type="button"
              onClick={() => void saveAttendance()}
            >
              Save event roster
            </Button>
          </div>
        </details>
      </Card>
      <Card className="mb-4 overflow-hidden">
        <CardContent className="space-y-3 px-0 sm:px-0">
          <div className="flex flex-wrap items-center gap-3 border-b px-3 pb-3">
            <div className="shrink-0">
              <p className="font-semibold">Event Roles</p>
            </div>
            {scheduleDays.length > 0 && (
              <div
                className="flex min-w-0 flex-wrap gap-2"
                aria-label="Event days"
              >
                {scheduleDays.map((day, index) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={date === day.date ? 'default' : 'outline'}
                    onClick={() => selectScheduleDay(day)}
                    key={day.date}
                  >
                    <span className="sm:hidden">Day {index + 1}</span>
                    <span className="hidden sm:inline">
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Button>
                ))}
              </div>
            )}
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
                  disabled={publishing}
                  onClick={() => setUnpublishConfirmOpen(true)}
                >
                  Unpublish
                </Button>
              )}
              <Button
                type="button"
                disabled={
                  publishing || (!hasUnpublishedChanges && publishedAt !== null)
                }
                onClick={() => void publishSchedule()}
              >
                {publishing
                  ? 'Working…'
                  : publishedAt
                    ? 'Publish shift changes'
                    : 'Publish shifts'}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Schedule date"
                className="h-10 rounded-md border bg-background px-3"
                type="date"
                value={date}
                onChange={(event) => {
                  const nextDate = event.target.value;
                  setDate(nextDate);
                  const existing = scheduleDays.find(
                    (day) => day.date === nextDate,
                  );
                  if (existing) selectScheduleDay(existing);
                  else setControls(defaultControls);
                }}
              />
              <select
                aria-label="First displayed hour"
                className="h-10 rounded-md border bg-background px-3"
                value={startHour}
                onChange={(event) =>
                  setStartHour(
                    Math.min(Number(event.target.value), endHour - 1),
                  )
                }
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option value={hour} key={hour}>
                    Start{' '}
                    {new Date(2000, 0, 1, hour).toLocaleTimeString([], {
                      hour: 'numeric',
                    })}
                  </option>
                ))}
              </select>
              <select
                aria-label="Last displayed hour"
                className="h-10 rounded-md border bg-background px-3"
                value={endHour}
                onChange={(event) =>
                  setEndHour(
                    Math.max(Number(event.target.value), startHour + 1),
                  )
                }
              >
                {Array.from({ length: 24 }, (_, index) => index + 1).map(
                  (hour) => (
                    <option value={hour} key={hour}>
                      End{' '}
                      {new Date(2000, 0, 1, hour % 24).toLocaleTimeString([], {
                        hour: 'numeric',
                      })}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={controls.scoutingEnabled}
                  onCheckedChange={(checked) =>
                    void changeControls({
                      ...controls,
                      scoutingEnabled: checked,
                    })
                  }
                />
                Scouting
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={controls.outreachEnabled}
                  onCheckedChange={(checked) =>
                    void changeControls({
                      ...controls,
                      outreachEnabled: checked,
                    })
                  }
                />
                Outreach
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!savedDay && (
                <Button type="button" onClick={() => void saveScheduleDay()}>
                  Add day
                </Button>
              )}
              {hoursChanged && (
                <Button type="button" onClick={() => void saveScheduleDay()}>
                  Update day
                </Button>
              )}
              {savedDay && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void removeScheduleDay(date)}
                >
                  Remove day
                </Button>
              )}
            </div>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="ml-auto rounded-full text-base"
                    aria-label="How to edit event assignments"
                  />
                }
              >
                ?
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 max-w-[calc(100vw-2rem)]"
              >
                <PopoverTitle>Editing assignments</PopoverTitle>
                <PopoverDescription className="leading-relaxed">
                  Type, paste, or choose a role in each time slot; a change
                  saves when you click out of the cell. Clear a cell to unassign
                  it. Arrow keys move between cells, Enter saves and moves down,
                  and Escape cancels. You can copy and paste single cells or
                  rectangular spreadsheet ranges.
                </PopoverDescription>
              </PopoverContent>
            </Popover>
          </div>
          {!scheduleDays.length && (
            <p className="px-3 text-sm text-muted-foreground">
              Add the first event day and choose when assignments can start and
              end.
            </p>
          )}
          <div
            className="max-h-[68dvh] overflow-auto border-y"
            data-schedule-scroll
          >
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-30 bg-muted">
                <tr>
                  <th
                    className="whitespace-nowrap border-r border-b bg-muted px-3 py-2 text-left md:sticky md:left-0 md:z-40"
                    style={{ width: `calc(${nameChars}ch + 1.5rem)` }}
                  >
                    Person
                  </th>
                  {hours.map((hour) => (
                    <th
                      className="whitespace-nowrap border-r border-b px-1 py-2 text-center"
                      key={hour}
                      style={{ minWidth: hourColumnWidth }}
                    >
                      {new Date(2000, 0, 1, hour).toLocaleTimeString([], {
                        hour: 'numeric',
                      })}
                      –
                      {new Date(2000, 0, 1, (hour + 1) % 24).toLocaleTimeString(
                        [],
                        { hour: 'numeric' },
                      )}
                    </th>
                  ))}
                  <th className="w-px border-b px-2 py-2 text-center">
                    Scouting Shifts
                  </th>
                  <th className="w-px border-b px-2 py-2 text-center">
                    Pit Shifts
                  </th>
                  <th className="w-px border-b border-l bg-muted px-2 py-2 text-center md:sticky md:right-0 md:z-40">
                    Total Shifts
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member, rowIndex) => (
                  <tr
                    className={
                      rowIndex % 2
                        ? 'bg-[color-mix(in_srgb,var(--muted)_20%,var(--background))]'
                        : 'bg-background'
                    }
                    key={member.scheduleRowKey}
                  >
                    <th className="whitespace-nowrap border-r border-b bg-inherit px-3 py-2 text-left font-medium md:sticky md:left-0 md:z-20">
                      {scheduleMemberName(member)}
                      {isGuestMember(member) && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal">
                          Guest
                        </span>
                      )}
                    </th>
                    {hours.map((hour, columnIndex) => {
                      const startsAt = slotTime(date, hour);
                      const memberItems = items
                        .filter(
                          (candidate) =>
                            candidate.userId === member.id &&
                            candidate.startsAt <= startsAt &&
                            candidate.endsAt > startsAt,
                        )
                        .sort((a, b) => a.label.localeCompare(b.label));
                      const item = memberItems[member.guestSlot ?? 0];
                      const key = `${member.scheduleRowKey}:${startsAt}`;
                      return (
                        <td
                          className="h-11 border-r border-b p-1"
                          key={hour}
                          style={{ minWidth: hourColumnWidth }}
                        >
                          <ScheduleRoleInput
                            ariaLabel={`${scheduleMemberName(member)}, ${new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' })}`}
                            busy={busyCell === key}
                            choices={choices}
                            cellId={`${columnIndex}:${rowIndex}`}
                            label={item?.label ?? ''}
                            onAdvance={() =>
                              focusCell(rowIndex + 1, columnIndex)
                            }
                            onCommit={(value) =>
                              void changeCell(member, hour, value)
                            }
                            onInvalid={(text) =>
                              setMessage(invalidRoleMessage(text))
                            }
                            onNavigate={(rowDelta, columnDelta) =>
                              focusCell(
                                rowIndex + rowDelta,
                                columnIndex + columnDelta,
                              )
                            }
                            onRangePaste={(text) =>
                              void pasteCells(rowIndex, columnIndex, text)
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="w-px border-b px-2 py-2 text-center">
                      {(shiftCounts.get(member.id) ?? emptyShifts).scouting}
                    </td>
                    <td className="w-px border-b px-2 py-2 text-center">
                      {(shiftCounts.get(member.id) ?? emptyShifts).pit}
                    </td>
                    <td className="w-px border-b border-l bg-inherit px-2 py-2 text-center font-semibold md:sticky md:right-0 md:z-20">
                      {(shiftCounts.get(member.id) ?? emptyShifts).total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {coverageGrid.map(({ target, counts: perHour }) => (
                  <tr key={target.label}>
                    <th className="whitespace-nowrap border-r border-b bg-background px-3 py-1 text-left text-xs font-medium md:sticky md:left-0 md:z-20">
                      {target.label}
                    </th>
                    {perHour.map((have, index) => (
                      <td
                        className={`border-r border-b px-1 py-1 text-center text-xs font-semibold ${
                          have >= target.need
                            ? 'bg-emerald-300 text-emerald-950 dark:bg-emerald-400 dark:text-emerald-950'
                            : 'bg-amber-300 text-amber-950 dark:bg-amber-400 dark:text-amber-950'
                        }`}
                        key={hours[index]}
                        title={`${have} of ${target.need} ${target.label.toLowerCase()}`}
                      >
                        {have}/{target.need}
                      </td>
                    ))}
                    <td colSpan={3} className="border-b" />
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
          {message && (
            <p className="px-3 text-sm text-destructive" role="status">
              {message}
            </p>
          )}
          <ConfirmActionDialog
            open={unpublishConfirmOpen}
            onOpenChange={setUnpublishConfirmOpen}
            title="Unpublish shifts?"
            description="The shift schedule will stop appearing for team members. Your draft assignments will be kept so you can edit and publish them again."
            confirmLabel="Unpublish shifts"
            destructive
            onConfirm={unpublishSchedule}
          />
        </CardContent>
      </Card>
    </>
  );
}
