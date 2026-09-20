'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Camera, Check, ChevronRight, ClipboardList, Cloud, CloudOff, Gauge, LayoutDashboard, LogOut, Minus, Moon, Plus, Radio, Settings, Shield, Sun, TowerControl, Upload, UserCog, Users, WandSparkles, Wrench, Zap } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getCachedValue, getDraft, getPendingMutations, queueMutation, saveCachedValue, saveDraft, synchronizePendingMutations } from '@/lib/offline-db';
import { observedPoints, type ScoutingPayload } from '@/lib/scouting-metrics';
import { canManageAssignments, canReopenEntries, scoutEntryMutationId } from '@/lib/scouting-policy';

type View = 'Home' | 'Scout' | 'Pit' | 'Schedule' | 'Teams' | 'Strategy' | 'Admin' | 'Settings';

const nav: { label: Exclude<View, 'Settings' | 'Admin'>; icon: typeof ClipboardList }[] = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Scout', icon: ClipboardList },
  { label: 'Pit', icon: Wrench },
  { label: 'Schedule', icon: CalendarDays },
  { label: 'Teams', icon: Users },
  { label: 'Strategy', icon: BarChart3 },
];

type EventPack = {
  event: { id: string; year: number; key: string; name: string; updatedAt: number };
  matches: EventMatch[];
  assignments: { matchId: string; teamNumber: number; scoutUserId: string; station: string }[];
  members: { id: string; name: string; email: string; role: string }[];
  pitEntries: PitEntry[];
  organizationId: string;
  role: string;
  userId: string;
};

type PitDraft = { drivetrain: string; swerveModule: string; motorTypes: string; weightLbs: number; widthInches: number; lengthInches: number; heightInches: number; fuelCapacity: number; climbCapability: string; autonomousCapabilities: string; notes: string };
type PitEntry = { teamNumber: number; drivetrain: string | null; swerveModule: string | null; motorTypes: string[]; weightLbs: number | null; dimensions: { width?: number; length?: number; height?: number } | null; payload: Partial<PitDraft>; photoObjectKey: string | null; updatedAt: number };
const emptyPitDraft: PitDraft = { drivetrain: 'Swerve', swerveModule: '', motorTypes: '', weightLbs: 0, widthInches: 0, lengthInches: 0, heightInches: 0, fuelCapacity: 0, climbCapability: 'None', autonomousCapabilities: '', notes: '' };

type EventMatch = {
  id: string; key: string; compLevel: string; matchNumber: number; scheduledAt: number | null; predictedAt: number | null;
  alliances: { red: number[]; blue: number[] };
  result: { winningAlliance?: string } | null;
};

function matchLabel(match: EventMatch) {
  const prefix: Record<string, string> = { qm: 'Q', ef: 'EF', qf: 'QF', sf: 'SF', f: 'F' };
  return `${prefix[match.compLevel] ?? match.compLevel.toUpperCase()}${match.matchNumber}`;
}

type MatchDraft = ScoutingPayload;

type TeamAnalysis = { teamNumber: number; samples: number; scheduledMatches: number; coverage: number; medianPoints: number; medianActiveFuel: number; medianFuelPerCycle: number; towerSuccessRate: number; disabledRate: number; averageDefense: number; pointStdDev: number; entries: { id: string; matchKey: string; scoutName: string; reopened: boolean }[] };

function Counter({ label, hint, value, onChange, quickAdds = [] }: { label: string; hint: string; value: number; onChange: (value: number) => void; quickAdds?: number[] }) {
  return <div className="counter-row"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div><div className="counter-controls">{quickAdds.map((amount) => <Button type="button" key={amount} variant="outline" onClick={() => onChange(value + amount)}>+{amount}</Button>)}<Button type="button" aria-label={`Remove one ${label}`} size="icon-lg" variant="outline" onClick={() => onChange(Math.max(0, value - 1))}><Minus /></Button><input aria-label={`${label} total`} className="counter-input" type="number" inputMode="numeric" min="0" value={value} onChange={(event) => onChange(Math.max(0, Number.parseInt(event.target.value, 10) || 0))} /><Button type="button" aria-label={`Add one ${label}`} size="icon-lg" onClick={() => onChange(value + 1)}><Plus /></Button></div></div>;
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [activeView, setActiveView] = useState<View>('Home');
  const [autoFuel, setAutoFuel] = useState(0); const [activeFuel, setActiveFuel] = useState(0); const [inactiveFuel, setInactiveFuel] = useState(0); const [cycles, setCycles] = useState(0);
  const [autoTower, setAutoTower] = useState('None'); const [tower, setTower] = useState('None'); const [path, setPath] = useState('Trench'); const [dark, setDark] = useState(false); const [saved, setSaved] = useState(false);
  const [defenseRating, setDefenseRating] = useState(0); const [disabled, setDisabled] = useState(false); const [noShow, setNoShow] = useState(false); const [penalties, setPenalties] = useState(0); const [shootingRange, setShootingRange] = useState('Mixed'); const [cycleSeconds, setCycleSeconds] = useState(0); const [notes, setNotes] = useState('');
  const [draftReady, setDraftReady] = useState(false); const [queuedCount, setQueuedCount] = useState(0); const [saveError, setSaveError] = useState('');
  const [online, setOnline] = useState(true); const [syncing, setSyncing] = useState(false); const [syncMessage, setSyncMessage] = useState('');
  const [eventKey, setEventKey] = useState('2026vablacksburg'); const [eventMessage, setEventMessage] = useState(''); const [configuringEvent, setConfiguringEvent] = useState(false);
  const [eventPack, setEventPack] = useState<EventPack | null>(null); const [packLoading, setPackLoading] = useState(false); const [packError, setPackError] = useState('');
  const [selectedMatchKey, setSelectedMatchKey] = useState(''); const [selectedTeam, setSelectedTeam] = useState<number | null>(null); const [selectedStation, setSelectedStation] = useState('');
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null); const [assignmentMessage, setAssignmentMessage] = useState('');
  const [strategyTeams, setStrategyTeams] = useState<TeamAnalysis[]>([]); const [adminMessage, setAdminMessage] = useState('');
  const [selectedScoutIds, setSelectedScoutIds] = useState<string[]>([]); const [assignmentStart, setAssignmentStart] = useState(1); const [assignmentEnd, setAssignmentEnd] = useState(999);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'mine' | 'unassigned'>('all'); const [scheduleSearch, setScheduleSearch] = useState('');
  const [pitTeam, setPitTeam] = useState<number | null>(null); const [pitDraft, setPitDraft] = useState<PitDraft>(emptyPitDraft); const [pitReady, setPitReady] = useState(false); const [pitMessage, setPitMessage] = useState('');
  const [pitPhoto, setPitPhoto] = useState<File | null>(null); const [photoUploading, setPhotoUploading] = useState(false); const [photoVersion, setPhotoVersion] = useState(0);
  const currentMatch = eventPack?.matches.find((match) => match.key === selectedMatchKey);
  const draftId = eventPack && currentMatch && selectedTeam ? `${eventPack.event.key}-${currentMatch.key}-${selectedTeam}` : null;
  const mutationId = eventPack && currentMatch && selectedTeam ? scoutEntryMutationId(eventPack.event.key, currentMatch.key, selectedTeam, session?.user.id ?? 'local') : null;
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'queued' | 'synchronized' | 'rejected'>('draft');
  const eventTeams = eventPack ? [...new Set(eventPack.matches.flatMap((match) => [...match.alliances.red, ...match.alliances.blue]))].sort((a, b) => a - b) : [];
  const currentPayload: ScoutingPayload = { autoFuel, activeFuel, inactiveFuel, cycles, autoTower, tower, path, defenseRating, disabled, noShow, penalties, shootingRange, cycleSeconds, notes };
  const estimatedPoints = observedPoints(currentPayload);
  const pitDraftId = eventPack && pitTeam ? `pit-${eventPack.event.key}-${pitTeam}` : null;
  const existingPitPhoto = pitTeam ? eventPack?.pitEntries.find((entry) => entry.teamNumber === pitTeam)?.photoObjectKey : null;

  useEffect(() => { getPendingMutations().then((pending) => setQueuedCount(pending.length)).catch(() => setSaveError('Offline storage is unavailable on this device.')); }, []);

  useEffect(() => {
    if (!draftId) { setDraftReady(false); return; }
    setDraftReady(false); setSaved(false); setSubmissionStatus('draft');
    getDraft<MatchDraft>(draftId).then((draft) => {
      if (draft) {
        setAutoFuel(draft.payload.autoFuel); setActiveFuel(draft.payload.activeFuel); setInactiveFuel(draft.payload.inactiveFuel); setCycles(draft.payload.cycles);
        setAutoTower(draft.payload.autoTower); setTower(draft.payload.tower); setPath(draft.payload.path);
        setDefenseRating(draft.payload.defenseRating ?? 0); setDisabled(draft.payload.disabled ?? false); setNoShow(draft.payload.noShow ?? false); setPenalties(draft.payload.penalties ?? 0); setShootingRange(draft.payload.shootingRange ?? 'Mixed'); setCycleSeconds(draft.payload.cycleSeconds ?? 0); setNotes(draft.payload.notes ?? '');
      } else {
        setAutoFuel(0); setActiveFuel(0); setInactiveFuel(0); setCycles(0); setAutoTower('None'); setTower('None'); setPath('Trench');
        setDefenseRating(0); setDisabled(false); setNoShow(false); setPenalties(0); setShootingRange('Mixed'); setCycleSeconds(0); setNotes('');
      }
      setDraftReady(true);
    }).catch(() => { setSaveError('Offline storage is unavailable on this device.'); setDraftReady(true); });
  }, [draftId]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection(); window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection);
    return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
  }, []);

  useEffect(() => { if (session) void loadEventPack(); }, [session]);

  useEffect(() => {
    if (!online || !session || queuedCount === 0 || syncing) return;
    const timer = window.setTimeout(() => void syncNow(), 1000);
    return () => window.clearTimeout(timer);
  }, [online, queuedCount, session]);

  useEffect(() => {
    if (activeView !== 'Strategy' || !selectedTeam || !online) return;
    fetch(`/api/analysis?team=${selectedTeam}`).then(async (response) => {
      const result = await response.json() as TeamAnalysis & { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Analysis unavailable.');
      setAnalysis(result);
    }).catch(() => setAnalysis(null));
  }, [activeView, online, selectedTeam]);

  useEffect(() => {
    if (activeView !== 'Strategy' || !online || !session) return;
    fetch('/api/strategy').then(async (response) => {
      const result = await response.json() as { teams?: TeamAnalysis[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Strategy data unavailable.');
      setStrategyTeams(result.teams ?? []);
    }).catch(() => setStrategyTeams([]));
  }, [activeView, online, session]);

  useEffect(() => {
    if (!draftReady || !draftId) return;
    const timer = window.setTimeout(() => {
      saveDraft({ id: draftId, payload: currentPayload, updatedAt: Date.now() })
        .then(() => setSaveError('')).catch(() => setSaveError('Could not save this draft offline.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeFuel, autoFuel, autoTower, cycleSeconds, cycles, defenseRating, disabled, draftId, draftReady, inactiveFuel, noShow, notes, path, penalties, shootingRange, tower]);

  useEffect(() => {
    if (!pitDraftId) { setPitReady(false); return; }
    setPitReady(false); setPitMessage(''); setPitPhoto(null);
    getDraft<PitDraft>(pitDraftId).then((draft) => {
      const serverEntry = eventPack?.pitEntries.find((entry) => entry.teamNumber === pitTeam);
      const serverDraft = serverEntry ? { ...emptyPitDraft, ...serverEntry.payload, drivetrain: serverEntry.drivetrain ?? 'Swerve', swerveModule: serverEntry.swerveModule ?? '', motorTypes: serverEntry.motorTypes.join(', '), weightLbs: serverEntry.weightLbs ?? 0, widthInches: serverEntry.dimensions?.width ?? 0, lengthInches: serverEntry.dimensions?.length ?? 0, heightInches: serverEntry.dimensions?.height ?? 0 } : emptyPitDraft;
      setPitDraft(draft?.payload ?? serverDraft); setPitReady(true);
    }).catch(() => { setPitDraft(emptyPitDraft); setPitReady(true); setPitMessage('Offline storage is unavailable on this device.'); });
  }, [eventPack, pitDraftId, pitTeam]);

  useEffect(() => {
    if (!pitReady || !pitDraftId) return;
    const timer = window.setTimeout(() => void saveDraft({ id: pitDraftId, payload: pitDraft, updatedAt: Date.now() }), 250);
    return () => window.clearTimeout(timer);
  }, [pitDraft, pitDraftId, pitReady]);

  async function submitMatch() {
    if (!draftId || !eventPack || !currentMatch || !selectedTeam) { setSaveError('Choose a match and team from the schedule first.'); return; }
    setSaveError('');
    try {
      await queueMutation({
        id: scoutEntryMutationId(eventPack.event.key, currentMatch.key, selectedTeam, session?.user.id ?? 'local'),
        organizationId: eventPack.organizationId, entity: 'scoutEntry', operation: 'upsert', createdAt: Date.now(), attempts: 0,
        payload: { eventKey: eventPack.event.key, matchKey: currentMatch.key, teamNumber: selectedTeam, station: selectedStation, seasonYear: eventPack.event.year, schemaVersion: 1, ...currentPayload },
      });
      setQueuedCount((await getPendingMutations()).length); setSaved(true); setSubmissionStatus('queued');
    } catch {
      setSaveError('Could not queue this match for synchronization.');
    }
  }

  async function submitPit() {
    if (!eventPack || !pitTeam) { setPitMessage('Choose a team first.'); return; }
    const id = `pit:${eventPack.event.key}:${pitTeam}`;
    try {
      await queueMutation({ id, organizationId: eventPack.organizationId, entity: 'pitEntry', operation: 'upsert', createdAt: Date.now(), attempts: 0,
        payload: { eventKey: eventPack.event.key, teamNumber: pitTeam, seasonYear: eventPack.event.year, schemaVersion: 1, ...pitDraft, motorTypes: pitDraft.motorTypes.split(',').map((motor) => motor.trim()).filter(Boolean) } });
      setQueuedCount((await getPendingMutations()).length); setPitMessage(online ? 'Pit report queued and ready to synchronize.' : 'Pit report saved offline. It will synchronize when connected.');
      if (online) await syncNow();
    } catch { setPitMessage('Could not save this pit report.'); }
  }

  async function uploadPitPhoto() {
    if (!pitTeam || !pitPhoto) { setPitMessage('Choose a robot photo first.'); return; }
    if (!online) { setPitMessage('Photo uploads require a connection. The rest of the pit report is still saved offline.'); return; }
    setPhotoUploading(true); setPitMessage('Saving the pit report before uploading…');
    try {
      await submitPit();
      const form = new FormData(); form.set('teamNumber', String(pitTeam)); form.set('photo', pitPhoto);
      const response = await fetch('/api/pit-photo', { method: 'POST', body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Photo upload failed.');
      setPitPhoto(null); setPhotoVersion(Date.now()); setPitMessage('Robot photo uploaded.'); await loadEventPack();
    } catch (error) { setPitMessage(error instanceof Error ? error.message : 'Photo upload failed.'); }
    finally { setPhotoUploading(false); }
  }

  async function loadEventPack() {
    setPackLoading(true); setPackError('');
    try {
      const response = await fetch('/api/event-pack');
      const result = await response.json() as EventPack & { error?: string; event: EventPack['event'] | null };
      if (!response.ok) throw new Error(result.error ?? 'Unable to load the event pack.');
      if (!result.event) { setEventPack(null); return; }
      const pack = { ...result, pitEntries: result.pitEntries ?? [], organizationId: result.organizationId ?? 'team-401' } as EventPack;
      setEventPack(pack); setEventKey(pack.event.key); await saveCachedValue('current-event-pack', pack);
      if (!selectedMatchKey && pack.matches.length > 0) {
        const mine = pack.assignments.find((assignment) => assignment.scoutUserId === pack.userId);
        const match = pack.matches.find((item) => item.id === mine?.matchId) ?? pack.matches[0];
        selectAssignment(match, mine?.teamNumber ?? match.alliances.red[0], mine?.station ?? 'red1');
      }
    } catch (error) {
      const cached = await getCachedValue<EventPack>('current-event-pack').catch(() => undefined);
      if (cached) { const pack = { ...cached, pitEntries: cached.pitEntries ?? [], organizationId: cached.organizationId ?? 'team-401' }; setEventPack(pack); setEventKey(pack.event.key); setPackError('Showing the event pack cached on this device.'); }
      else setPackError(error instanceof Error ? error.message : 'Unable to load the event pack.');
    } finally {
      setPackLoading(false);
    }
  }

  function selectAssignment(match: EventMatch, team: number, station: string) {
    setSelectedMatchKey(match.key); setSelectedTeam(team); setSelectedStation(station); setSaved(false); setSubmissionStatus('draft'); setActiveView('Scout');
  }

  async function assignScout(match: EventMatch, team: number, station: string, scoutUserId: string) {
    setAssignmentMessage('');
    const response = await fetch('/api/assignments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ matchId: match.id, teamNumber: team, station, scoutUserId }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setAssignmentMessage(result.error ?? 'Could not save assignment.'); return; }
    setAssignmentMessage('Assignment saved.'); await loadEventPack();
  }

  async function reopenEntry(entryId: string) {
    const response = await fetch('/api/entries/reopen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entryId }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setSyncMessage(result.error ?? 'Could not reopen entry.'); return; }
    setSyncMessage('Entry reopened for correction.');
    if (selectedTeam) {
      const refreshed = await fetch(`/api/analysis?team=${selectedTeam}`).then((item) => item.json()) as TeamAnalysis;
      setAnalysis(refreshed);
    }
  }

  async function updateMemberRole(userId: string, role: string) {
    setAdminMessage('');
    const response = await fetch('/api/members', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, role }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setAdminMessage(result.error ?? 'Could not update role.'); return; }
    setAdminMessage('Role updated.'); await loadEventPack();
  }

  async function generateAssignments() {
    setAdminMessage('');
    const response = await fetch('/api/assignments/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scoutUserIds: selectedScoutIds, startMatch: assignmentStart, endMatch: assignmentEnd }) });
    const result = await response.json() as { error?: string; matchesAssigned?: number; slotsAssigned?: number };
    if (!response.ok) { setAdminMessage(result.error ?? 'Could not generate assignments.'); return; }
    setAdminMessage(`Assigned ${result.slotsAssigned ?? 0} stations across ${result.matchesAssigned ?? 0} matches.`); await loadEventPack();
  }

  async function syncNow() {
    if (!session) { setSyncMessage('Sign in before synchronizing.'); return; }
    if (!online) { setSyncMessage('This device is offline. Your entries are still safe.'); return; }
    setSyncing(true); setSyncMessage('');
    try {
      const result = await synchronizePendingMutations();
      setQueuedCount(result.pending);
      if (mutationId && result.acceptedIds.includes(mutationId)) setSubmissionStatus('synchronized');
      if (mutationId && result.rejected.some((item) => item.id === mutationId)) setSubmissionStatus('rejected');
      setSyncMessage(result.errors[0] ?? (result.accepted > 0 ? `${result.accepted} match ${result.accepted === 1 ? 'entry' : 'entries'} synchronized.` : 'Everything is synchronized.'));
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Synchronization failed. Your entries are still queued.');
    } finally {
      setSyncing(false);
    }
  }

  async function configureEvent() {
    setConfiguringEvent(true); setEventMessage('');
    try {
      const response = await fetch('/api/event-pack', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ eventKey: eventKey.trim().toLowerCase() }) });
      const result = await response.json() as { error?: string; event?: { name: string }; matchCount?: number };
      if (!response.ok) throw new Error(result.error ?? 'Unable to load this event.');
      setEventMessage(`${result.event?.name ?? eventKey} is current. Cached ${result.matchCount ?? 0} matches.`);
      await loadEventPack();
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : 'Unable to load this event.');
    } finally {
      setConfiguringEvent(false);
    }
  }

  function renderStation(match: EventMatch, color: 'red' | 'blue', team: number, index: number) {
    const station = `${color}${index + 1}`;
    const assignment = eventPack?.assignments.find((item) => item.matchId === match.id && item.station === station);
    const scout = eventPack?.members.find((member) => member.id === assignment?.scoutUserId);
    const canManage = eventPack && canManageAssignments(eventPack.role);
    return <div className="grid gap-1" key={`${station}-${team}`}><button className={`choice ${color === 'red' ? 'border-red-300' : 'border-blue-300'}`} onClick={() => selectAssignment(match, team, station)}>{color === 'red' ? 'R' : 'B'}{index + 1} · {team}</button>{canManage ? <select aria-label={`Scout assigned to ${station} team ${team}`} className="h-8 rounded-md border bg-transparent px-1 text-xs" value={assignment?.scoutUserId ?? ''} onChange={(event) => event.target.value && void assignScout(match, team, station, event.target.value)}><option value="">Unassigned</option>{eventPack.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select> : <small className="text-center text-muted-foreground">{scout?.name ?? 'Unassigned'}</small>}</div>;
  }

  const myAssignments = eventPack?.assignments.map((assignment) => ({ assignment, match: eventPack.matches.find((match) => match.id === assignment.matchId) })).filter((item) => item.assignment.scoutUserId === eventPack.userId && item.match) ?? [];
  const nextAssignment = myAssignments[0];
  const isAdmin = Boolean(eventPack && canManageAssignments(eventPack.role));
  const visibleMatches = eventPack?.matches.filter((match) => {
    const assignments = eventPack.assignments.filter((item) => item.matchId === match.id);
    if (scheduleFilter === 'mine' && !assignments.some((item) => item.scoutUserId === eventPack.userId)) return false;
    if (scheduleFilter === 'unassigned' && assignments.length >= 6) return false;
    const query = scheduleSearch.trim().toLowerCase();
    return !query || matchLabel(match).toLowerCase().includes(query) || [...match.alliances.red, ...match.alliances.blue].some((team) => String(team).includes(query));
  }) ?? [];
  const totalSlots = (eventPack?.matches.length ?? 0) * 6;
  const assignmentCounts = eventPack?.members.map((member) => ({ member, count: eventPack.assignments.filter((assignment) => assignment.scoutUserId === member.id).length })) ?? [];

  return <main className={dark ? 'dark app-shell' : 'app-shell'}>
    <aside className="desktop-nav"><div className="brand-mark">401</div><nav aria-label="Primary navigation" className="mt-8 grid gap-2">{nav.map(({ label, icon: Icon }) => <button type="button" aria-current={activeView === label ? 'page' : undefined} onClick={() => setActiveView(label)} className={activeView === label ? 'nav-item active' : 'nav-item'} key={label}><Icon /><span>{label}</span></button>)}<button type="button" aria-current={activeView === 'Admin' ? 'page' : undefined} onClick={() => setActiveView('Admin')} className={activeView === 'Admin' ? 'nav-item active' : 'nav-item'}><UserCog /><span>Admin</span></button></nav><button type="button" aria-current={activeView === 'Settings' ? 'page' : undefined} onClick={() => setActiveView('Settings')} className={activeView === 'Settings' ? 'nav-item active mt-auto' : 'nav-item mt-auto'}><Settings /><span>Settings</span></button></aside>
    <section className="min-w-0 flex-1"><header className="topbar"><div><p className="eyebrow">{eventPack?.event.name ?? 'Team 401'}</p><h1>{activeView === 'Scout' ? currentMatch ? matchLabel(currentMatch) : 'Choose an assignment' : activeView}</h1></div><div className="flex items-center gap-2"><Badge variant="outline" className="status-badge">{online ? <Cloud /> : <CloudOff />}{online ? 'Online' : 'Offline ready'}</Badge>{!isPending && (session ? <Button variant="outline" onClick={() => authClient.signOut().then(() => window.location.reload())}><LogOut />{session.user.name}</Button> : <Button nativeButton={false} render={<a href="/sign-in" />}>Sign in</Button>)}<Button aria-label="Toggle color theme" size="icon" variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button></div></header>
      {activeView === 'Home' && <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"><Card className="sm:col-span-2"><CardHeader><CardTitle>Welcome, {session?.user.name ?? 'scout'}</CardTitle><Badge variant="outline">{eventPack?.role ?? 'signed out'}</Badge></CardHeader><CardContent><p className="text-muted-foreground">{eventPack?.event.name ?? 'An admin needs to load the current event.'}</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setActiveView('Schedule')}><CalendarDays />Open schedule</Button><Button variant="outline" onClick={() => setActiveView('Strategy')}><BarChart3 />Strategy workspace</Button>{isAdmin && <Button variant="outline" onClick={() => setActiveView('Admin')}><UserCog />Administration</Button>}</div></CardContent></Card><Card><CardHeader><CardTitle>Next assignment</CardTitle></CardHeader><CardContent className="space-y-3">{nextAssignment?.match ? <><div><p className="text-2xl font-bold">{matchLabel(nextAssignment.match)}</p><p className="text-muted-foreground">Team {nextAssignment.assignment.teamNumber} · {nextAssignment.assignment.station.toUpperCase()}</p></div><Button className="w-full" onClick={() => selectAssignment(nextAssignment.match!, nextAssignment.assignment.teamNumber, nextAssignment.assignment.station)}>Start scouting</Button></> : <p className="text-sm text-muted-foreground">No assignment has been scheduled for you yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>My assignments</CardTitle><Badge variant="outline">{myAssignments.length}</Badge></CardHeader><CardContent className="space-y-1">{myAssignments.slice(0, 5).map(({ assignment, match }) => match && <button className="schedule-row w-full text-left" onClick={() => selectAssignment(match, assignment.teamNumber, assignment.station)} key={`${match.id}-${assignment.station}`}><strong>{matchLabel(match)}</strong><span>Team {assignment.teamNumber}</span><small>{assignment.station.toUpperCase()}</small></button>)}{myAssignments.length === 0 && <p className="text-sm text-muted-foreground">No assignments yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Device status</CardTitle></CardHeader><CardContent className="mini-stats"><span><strong>{queuedCount}</strong> pending sync</span><span><strong>{online ? 'Online' : 'Offline'}</strong> connection</span></CardContent></Card><Card><CardHeader><CardTitle>Event coverage</CardTitle></CardHeader><CardContent className="mini-stats"><span><strong>{eventPack?.assignments.length ?? 0}</strong> assigned slots</span><span><strong>{totalSlots}</strong> total slots</span></CardContent></Card><Card><CardHeader><CardTitle>Quick links</CardTitle></CardHeader><CardContent className="grid gap-2"><Button variant="outline" onClick={() => setActiveView('Teams')}>Browse {eventTeams.length} teams</Button><Button variant="outline" onClick={() => void syncNow()} disabled={!queuedCount || syncing}>Sync this device</Button></CardContent></Card></div>}
      {activeView === 'Scout' && <div className="content-grid"><div className="min-w-0 space-y-4">
        <Card className="match-card"><CardContent className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="station-dot" /><div><p className="eyebrow">{selectedStation ? `${selectedStation.replace(/(red|blue)/, '$1 ')} · Selected assignment` : 'No assignment selected'}</p><p className="text-2xl font-bold">{selectedTeam ? `Team ${selectedTeam}` : 'Open the schedule'}</p></div></div><div className="text-right"><p className="text-xs text-muted-foreground">{eventPack?.event.year ?? 2026} REBUILT</p><p className="font-mono text-lg font-bold text-primary">{currentMatch?.predictedAt ? new Date(currentMatch.predictedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</p></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Autonomous · 20 seconds</CardTitle><Badge variant="secondary"><Zap /> HUB active</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="FUEL scored" hint="Use +5 for a burst, then adjust or type the total" value={autoFuel} onChange={setAutoFuel} quickAdds={[5]} /><div className="choice-section"><span><strong>Auto TOWER</strong><small>LEVEL 1 only</small></span><div className="two-choices">{['None', 'Level 1'].map((item) => <button type="button" onClick={() => setAutoTower(item)} key={item} className={autoTower === item ? 'choice selected' : 'choice'}>{autoTower === item && <Check />}{item}</button>)}</div></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Teleoperated FUEL</CardTitle><Badge variant="outline">Shift-aware</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="Active HUB FUEL" hint="Add observed bursts with +5 or +10; fine-tune anytime" value={activeFuel} onChange={setActiveFuel} quickAdds={[5, 10]} /><Counter label="Inactive HUB attempts" hint="Useful efficiency and awareness signal" value={inactiveFuel} onChange={setInactiveFuel} quickAdds={[5]} /><Counter label="Scoring cycles" hint="Intake → shoot cycles completed" value={cycles} onChange={setCycles} /></CardContent></Card>
        <div className="form-pair"><Card><CardHeader><CardTitle><Gauge /> Field movement</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2">{['Trench', 'Bump', 'Both'].map((item) => <button key={item} onClick={() => setPath(item)} className={path === item ? 'choice selected' : 'choice'}>{path === item && <Check />}{item}</button>)}</CardContent></Card><Card><CardHeader><CardTitle><Shield /> Defense</CardTitle></CardHeader><CardContent className="rating-row">{[0,1,2,3].map((rating) => <button onClick={() => setDefenseRating(rating)} className={defenseRating === rating ? 'selected' : ''} key={rating}>{rating}</button>)}</CardContent></Card></div>
        <Card><CardHeader className="border-b"><CardTitle>Scoring profile</CardTitle></CardHeader><CardContent className="space-y-4 pt-4"><div><p className="mb-2 font-semibold">Typical shooting range</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['Near', 'Midfield', 'Far', 'Mixed'].map((item) => <button className={shootingRange === item ? 'choice selected' : 'choice'} onClick={() => setShootingRange(item)} key={item}>{shootingRange === item && <Check />}{item}</button>)}</div></div><Counter label="Average cycle time" hint="Approximate seconds from intake to shot" value={cycleSeconds} onChange={setCycleSeconds} /><Counter label="Penalty points caused" hint="Observed penalties attributable to this robot" value={penalties} onChange={setPenalties} quickAdds={[5]} /></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle><TowerControl /> Endgame TOWER</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['None', 'Level 1', 'Level 2', 'Level 3'].map((item) => <button onClick={() => setTower(item)} key={item} className={tower === item ? 'choice selected' : 'choice'}>{tower === item && <Check />}{item}</button>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Reliability and notes</CardTitle></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-2"><button className={disabled ? 'choice selected' : 'choice'} onClick={() => setDisabled(!disabled)}>{disabled && <Check />}Disabled or broken</button><button className={noShow ? 'choice selected' : 'choice'} onClick={() => setNoShow(!noShow)}>{noShow && <Check />}No-show</button></div><textarea className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-base" value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} placeholder="Strategy-relevant observations, failure details, defense quality…" /></CardContent></Card>
        {saveError && <p role="alert" className="auth-error">{saveError}</p>}<Button className="h-12 w-full text-base" disabled={!draftReady || submissionStatus === 'synchronized'} onClick={submitMatch}>{submissionStatus === 'synchronized' ? <><Check /> Synchronized · locked</> : submissionStatus === 'rejected' ? <>Rejected · review sync error</> : submissionStatus === 'queued' ? <><Check /> Queued for sync · {estimatedPoints} pts observed</> : draftReady ? <>Save match offline <ChevronRight /></> : <>Opening offline storage…</>}</Button>
      </div><aside className="right-rail"><Card className="score-card"><CardHeader><CardTitle>Observed output</CardTitle><Badge className="live-badge"><Radio />Live</Badge></CardHeader><CardContent><p className="score-number">{estimatedPoints}</p><p className="text-sm text-muted-foreground">estimated contributed points</p><div className="mini-stats"><span><strong>{activeFuel}</strong> active FUEL</span><span><strong>{Math.round(activeFuel / Math.max(cycles,1))}</strong> FUEL / cycle</span></div></CardContent></Card><Card><CardHeader><CardTitle>Offline queue</CardTitle><Badge variant="outline"><CloudOff />{queuedCount} pending</Badge></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Draft changes save automatically. Submitted matches remain on this device until synchronization is available.</p><Button className="w-full" variant="outline" disabled={syncing || queuedCount === 0} onClick={syncNow}><Cloud />{syncing ? 'Synchronizing…' : 'Sync now'}</Button>{syncMessage && <p className="text-xs text-muted-foreground" role="status">{syncMessage}</p>}</CardContent></Card><Card><CardHeader><CardTitle>Up next</CardTitle></CardHeader><CardContent className="space-y-1">{eventPack?.matches.slice(Math.max(0, eventPack.matches.findIndex((match) => match.key === selectedMatchKey) + 1), Math.max(0, eventPack.matches.findIndex((match) => match.key === selectedMatchKey) + 1) + 3).map((match) => <button className="schedule-row w-full text-left" onClick={() => setActiveView('Schedule')} key={match.key}><strong>{matchLabel(match)}</strong><span>{match.alliances.red.join(', ')}</span><small>vs {match.alliances.blue.join(', ')}</small></button>)}</CardContent></Card><Card><CardContent className="space-y-2"><p className="eyebrow">Event pack</p><strong>{eventPack?.event.name ?? 'No current event'}</strong><p className="text-xs text-muted-foreground">{eventPack ? `${eventPack.matches.length} matches and ${eventTeams.length} teams cached.` : 'Set a current event in Settings.'}</p></CardContent></Card></aside></div>}
      {activeView === 'Pit' && <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[18rem_1fr]"><Card><CardHeader><CardTitle>Pit queue</CardTitle><Badge variant="outline">{eventPack?.pitEntries.length ?? 0}/{eventTeams.length} complete</Badge></CardHeader><CardContent className="max-h-[65vh] space-y-1 overflow-auto">{eventTeams.map((team) => { const complete = eventPack?.pitEntries.some((entry) => entry.teamNumber === team); return <button type="button" className={pitTeam === team ? 'schedule-row selected w-full text-left' : 'schedule-row w-full text-left'} onClick={() => setPitTeam(team)} key={team}><strong>Team {team}</strong><span>{complete ? 'Report saved' : 'Not scouted'}</span>{complete ? <Check /> : <ChevronRight />}</button>; })}{eventTeams.length === 0 && <p className="text-sm text-muted-foreground">Load an event pack before pit scouting.</p>}</CardContent></Card><Card><CardHeader><CardTitle>{pitTeam ? `Team ${pitTeam} robot` : 'Choose a team'}</CardTitle>{pitTeam && <Badge variant="outline">Auto-saved offline</Badge>}</CardHeader><CardContent className="space-y-4">{pitTeam && <><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Drivetrain<select className="h-10 rounded-md border bg-transparent px-3" value={pitDraft.drivetrain} onChange={(event) => setPitDraft({ ...pitDraft, drivetrain: event.target.value })}><option>Swerve</option><option>Tank</option><option>Mecanum</option><option>Other</option></select></label><label className="grid gap-1 text-sm">Swerve module<Input disabled={pitDraft.drivetrain !== 'Swerve'} value={pitDraft.swerveModule} onChange={(event) => setPitDraft({ ...pitDraft, swerveModule: event.target.value })} placeholder="MK4i, MAXSwerve…" /></label><label className="grid gap-1 text-sm">Motor types<Input value={pitDraft.motorTypes} onChange={(event) => setPitDraft({ ...pitDraft, motorTypes: event.target.value })} placeholder="Kraken X60, NEO…" /></label><label className="grid gap-1 text-sm">Weight (lb)<Input type="number" min="0" inputMode="decimal" value={pitDraft.weightLbs || ''} onChange={(event) => setPitDraft({ ...pitDraft, weightLbs: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm">Width (in)<Input type="number" min="0" inputMode="decimal" value={pitDraft.widthInches || ''} onChange={(event) => setPitDraft({ ...pitDraft, widthInches: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm">Length (in)<Input type="number" min="0" inputMode="decimal" value={pitDraft.lengthInches || ''} onChange={(event) => setPitDraft({ ...pitDraft, lengthInches: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm">Height (in)<Input type="number" min="0" inputMode="decimal" value={pitDraft.heightInches || ''} onChange={(event) => setPitDraft({ ...pitDraft, heightInches: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm">FUEL capacity<Input type="number" min="0" inputMode="numeric" value={pitDraft.fuelCapacity || ''} onChange={(event) => setPitDraft({ ...pitDraft, fuelCapacity: Number(event.target.value) })} /></label><label className="grid gap-1 text-sm">Tower capability<select className="h-10 rounded-md border bg-transparent px-3" value={pitDraft.climbCapability} onChange={(event) => setPitDraft({ ...pitDraft, climbCapability: event.target.value })}><option>None</option><option>Level 1</option><option>Level 2</option><option>Level 3</option><option>Multiple levels</option></select></label></div><label className="grid gap-1 text-sm">Autonomous capabilities<textarea className="min-h-20 rounded-md border bg-transparent p-3" value={pitDraft.autonomousCapabilities} onChange={(event) => setPitDraft({ ...pitDraft, autonomousCapabilities: event.target.value })} placeholder="Starting locations, paths, scoring routines…" /></label><label className="grid gap-1 text-sm">Notes<textarea className="min-h-24 rounded-md border bg-transparent p-3" value={pitDraft.notes} onChange={(event) => setPitDraft({ ...pitDraft, notes: event.target.value })} placeholder="Mechanisms, reliability concerns, programming notes…" /></label><Button className="w-full sm:w-auto" disabled={!pitReady} onClick={() => void submitPit()}><Cloud />Save pit report</Button>{pitMessage && <p className="text-sm text-muted-foreground" role="status">{pitMessage}</p>}</>}</CardContent></Card></div>}
      {activeView === 'Pit' && pitTeam && <div className="px-4 pb-4 sm:px-6 sm:pb-6"><Card><CardHeader><CardTitle><Camera />Team {pitTeam} robot photo</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-[12rem_1fr]">{existingPitPhoto && <img className="aspect-square w-full rounded-md object-cover" src={`/api/pit-photo?team=${pitTeam}&v=${photoVersion}`} alt={`Team ${pitTeam} robot`} />}<div className="space-y-3"><p className="text-sm text-muted-foreground">JPEG, PNG, or WebP up to 10 MB. The pit report is synchronized before the image is stored privately in R2.</p><Input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => setPitPhoto(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" disabled={!pitPhoto || photoUploading || !online} onClick={() => void uploadPitPhoto()}><Upload />{photoUploading ? 'Uploading…' : existingPitPhoto ? 'Replace photo' : 'Upload photo'}</Button></div></CardContent></Card></div>}
      {activeView === 'Schedule' && <div className="p-4 sm:p-6"><Card><CardHeader><CardTitle>{eventPack?.event.name ?? 'Match schedule'}</CardTitle><Badge variant="outline">{visibleMatches.length} of {eventPack?.matches.length ?? 0}</Badge></CardHeader><CardContent className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><Input value={scheduleSearch} onChange={(event) => setScheduleSearch(event.target.value)} placeholder="Search match or team number" /><div className="flex gap-1">{(['all','mine','unassigned'] as const).map((filter) => <Button size="sm" variant={scheduleFilter === filter ? 'default' : 'outline'} onClick={() => setScheduleFilter(filter)} key={filter}>{filter === 'all' ? 'All' : filter === 'mine' ? 'Mine' : 'Needs scout'}</Button>)}</div></div>{packLoading && <p className="text-sm text-muted-foreground">Loading event pack…</p>}{packError && <p className="auth-error">{packError}</p>}{assignmentMessage && <p className="text-sm text-muted-foreground" role="status">{assignmentMessage}</p>}{visibleMatches.map((match) => <div className="rounded-lg border p-3" key={match.key}><div className="mb-2 flex items-center justify-between"><strong>{matchLabel(match)}</strong><small className="text-muted-foreground">{match.predictedAt ? new Date(match.predictedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time TBD'}</small></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="grid grid-cols-3 gap-2">{match.alliances.red.map((team, index) => renderStation(match, 'red', team, index))}</div><div className="grid grid-cols-3 gap-2">{match.alliances.blue.map((team, index) => renderStation(match, 'blue', team, index))}</div></div></div>)}{!packLoading && !eventPack && <p className="text-sm text-muted-foreground">No event pack is loaded. An owner or admin can load one in Admin.</p>}{eventPack && visibleMatches.length === 0 && <p className="text-sm text-muted-foreground">No matches match this filter.</p>}</CardContent></Card></div>}
      {activeView === 'Teams' && <div className="p-4 sm:p-6"><Card><CardHeader><CardTitle>Teams at {eventPack?.event.name ?? 'this event'}</CardTitle><Badge variant="outline">{eventTeams.length} teams</Badge></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{eventTeams.map((team) => <button onClick={() => { setSelectedTeam(team); setActiveView('Strategy'); }} className="schedule-row w-full text-left" key={team}><strong>Team {team}</strong><span>{eventPack?.matches.filter((match) => [...match.alliances.red, ...match.alliances.blue].includes(team)).length} matches</span><ChevronRight /></button>)}</CardContent></Card></div>}
      {activeView === 'Strategy' && <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6"><Card className="sm:col-span-2"><CardHeader><CardTitle>Event ranking workspace</CardTitle><div className="flex gap-2"><Badge variant="outline">{strategyTeams.length} teams</Badge>{eventPack && canReopenEntries(eventPack.role) && <Button nativeButton={false} size="sm" variant="outline" render={<a href="/api/export/scouting" download />}><Cloud />Export CSV</Button>}</div></CardHeader><CardContent className="max-h-96 overflow-auto"><div className="strategy-table"><strong>Team</strong><strong>Samples</strong><strong>Median pts</strong><strong>Fuel/cycle</strong><strong>Coverage</strong>{[...strategyTeams].sort((a, b) => b.medianPoints - a.medianPoints).map((team) => <button key={team.teamNumber} onClick={() => setSelectedTeam(team.teamNumber)} className={selectedTeam === team.teamNumber ? 'selected' : ''}><span>{team.teamNumber}</span><span>{team.samples}</span><span>{team.medianPoints.toFixed(1)}</span><span>{team.medianFuelPerCycle.toFixed(1)}</span><span>{Math.round(team.coverage * 100)}%</span></button>)}</div></CardContent></Card><Card><CardHeader><CardTitle>{selectedTeam ? `Team ${selectedTeam} snapshot` : 'Select a team above'}</CardTitle><Badge variant="outline">{analysis?.samples ?? 0} samples</Badge></CardHeader><CardContent><p className="score-number">{analysis?.medianPoints ?? 0}</p><p className="text-sm text-muted-foreground">median observed points</p><div className="mini-stats"><span><strong>{analysis?.medianActiveFuel ?? 0}</strong> median active FUEL</span><span><strong>{analysis?.medianFuelPerCycle.toFixed(1) ?? '0.0'}</strong> FUEL / cycle</span><span><strong>{analysis?.pointStdDev.toFixed(1) ?? '0.0'}</strong> point deviation</span><span><strong>{analysis?.averageDefense.toFixed(1) ?? '0.0'}</strong> defense rating</span></div></CardContent></Card><Card><CardHeader><CardTitle>Reliability and coverage</CardTitle></CardHeader><CardContent className="mini-stats"><span><strong>{Math.round((analysis?.towerSuccessRate ?? 0) * 100)}%</strong> tower success</span><span><strong>{Math.round((analysis?.disabledRate ?? 0) * 100)}%</strong> disabled rate</span><span><strong>{Math.round((analysis?.coverage ?? 0) * 100)}%</strong> data coverage</span><span><strong>{analysis?.scheduledMatches ?? 0}</strong> scheduled matches</span></CardContent></Card><Card className="sm:col-span-2"><CardHeader><CardTitle>Submitted entries</CardTitle></CardHeader><CardContent className="space-y-1">{analysis?.entries.map((entry) => <div className="schedule-row" key={entry.id}><strong>{entry.matchKey.split('_').at(-1)?.toUpperCase()}</strong><span>{entry.scoutName}{entry.reopened ? ' · reopened' : ''}</span>{eventPack && canReopenEntries(eventPack.role) && !entry.reopened ? <Button size="sm" variant="outline" onClick={() => void reopenEntry(entry.id)}>Reopen</Button> : <small>{entry.reopened ? 'Editable' : 'Locked'}</small>}</div>)}{analysis?.entries.length === 0 && <p className="text-sm text-muted-foreground">No synchronized entries for this team yet.</p>}</CardContent></Card></div>}
      {activeView === 'Admin' && isAdmin && <div className="grid gap-4 p-4 sm:p-6"><Card><CardHeader><CardTitle>Current event</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Load the TBA schedule used by every device.</p><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="TBA event key" value={eventKey} onChange={(event) => setEventKey(event.target.value)} placeholder="2026vabla" /><Button disabled={configuringEvent || !online || !session} onClick={configureEvent}>{configuringEvent ? 'Loading…' : 'Load event pack'}</Button></div>{eventMessage && <p className="text-sm text-muted-foreground" role="status">{eventMessage}</p>}</CardContent></Card><Card><CardHeader><CardTitle><WandSparkles />Bulk scout assignments</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Select scouts once, then distribute all six stations in a balanced rotation. Individual stations can still be adjusted on Schedule.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{eventPack?.members.map((member) => <label className="choice px-3" key={member.id}><input type="checkbox" checked={selectedScoutIds.includes(member.id)} onChange={(event) => setSelectedScoutIds((ids) => event.target.checked ? [...ids, member.id] : ids.filter((id) => id !== member.id))} />{member.name}</label>)}</div><div className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-sm">Start match<Input type="number" min="1" value={assignmentStart} onChange={(event) => setAssignmentStart(Number(event.target.value))} /></label><label className="grid gap-1 text-sm">End match<Input type="number" min="1" value={assignmentEnd} onChange={(event) => setAssignmentEnd(Number(event.target.value))} /></label><Button disabled={!selectedScoutIds.length} onClick={generateAssignments}><WandSparkles />Generate rotation</Button></div></CardContent></Card><Card><CardHeader><CardTitle>Assignment coverage</CardTitle><Badge variant="outline">{eventPack?.assignments.length ?? 0}/{totalSlots}</Badge></CardHeader><CardContent><div className="coverage-track"><span style={{ width: `${totalSlots ? Math.min(100, ((eventPack?.assignments.length ?? 0) / totalSlots) * 100) : 0}%` }} /></div><div className="mt-3 grid gap-1 sm:grid-cols-2">{assignmentCounts.map(({ member, count }) => <div className="schedule-row" key={member.id}><strong>{count}</strong><span>{member.name}</span><small>slots</small></div>)}</div><Button className="mt-3" variant="outline" onClick={() => { setScheduleFilter('unassigned'); setActiveView('Schedule'); }}>Review unassigned matches</Button></CardContent></Card><Card><CardHeader><CardTitle>Team members and roles</CardTitle><Badge variant="outline">{eventPack?.members.length ?? 0} accounts</Badge></CardHeader><CardContent className="space-y-1">{eventPack?.members.map((member) => <div className="member-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email}</small></div>{member.role === 'owner' ? <Badge>Owner</Badge> : <select value={member.role} onChange={(event) => void updateMemberRole(member.id, event.target.value)}><option value="admin">Admin</option><option value="strategy">Strategy</option><option value="scout">Scout</option><option value="video">Video</option></select>}</div>)}{adminMessage && <p className="text-sm text-muted-foreground" role="status">{adminMessage}</p>}</CardContent></Card></div>}
      {activeView === 'Admin' && !isAdmin && <div className="p-4 sm:p-6"><Card><CardHeader><CardTitle>Administration access</CardTitle><Badge variant="outline">{eventPack?.role ?? (session ? 'no team role' : 'signed out')}</Badge></CardHeader><CardContent className="space-y-3"><p>Your account is signed in, but it does not have an owner or admin role in this deployment.</p><p className="text-sm text-muted-foreground">Staging uses a separate database, so roles from the main site do not carry over. Ask a staging owner to promote {session?.user.email ?? 'this account'}, or sign in with the staging owner account.</p>{!session && <Button nativeButton={false} render={<a href="/sign-in" />}>Sign in</Button>}</CardContent></Card></div>}
      {activeView === 'Settings' && <div className="grid gap-4 p-4 sm:p-6"><Card><CardHeader><CardTitle>Display settings</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-4"><div><p className="font-semibold">Color theme</p><p className="text-sm text-muted-foreground">Choose the theme for this device.</p></div><Button variant="outline" onClick={() => setDark(!dark)}>{dark ? <><Sun />Use light mode</> : <><Moon />Use dark mode</>}</Button></CardContent></Card></div>}
    </section><nav aria-label="Mobile navigation" className="mobile-nav">{nav.map(({ label, icon: Icon }) => <button type="button" aria-current={activeView === label ? 'page' : undefined} onClick={() => setActiveView(label)} className={activeView === label ? 'active' : ''} key={label}><Icon /><span>{label}</span></button>)}<button type="button" onClick={() => setActiveView('Admin')} className={activeView === 'Admin' ? 'active' : ''}><UserCog /><span>Admin</span></button></nav>
  </main>;
}
