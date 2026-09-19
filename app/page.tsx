'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Check, ChevronRight, ClipboardList, Cloud, CloudOff, Gauge, LogOut, Minus, Moon, Plus, Radio, Settings, Shield, Sun, TowerControl, Users, Zap } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDraft, getPendingMutations, queueMutation, saveDraft, synchronizePendingMutations } from '@/lib/offline-db';

type View = 'Scout' | 'Schedule' | 'Teams' | 'Analysis' | 'Settings';

const nav: { label: Exclude<View, 'Settings'>; icon: typeof ClipboardList }[] = [
  { label: 'Scout', icon: ClipboardList },
  { label: 'Schedule', icon: CalendarDays },
  { label: 'Teams', icon: Users },
  { label: 'Analysis', icon: BarChart3 },
];

type EventPack = {
  event: { id: string; year: number; key: string; name: string; updatedAt: number };
  matches: EventMatch[];
};

type EventMatch = {
  id: string; key: string; compLevel: string; matchNumber: number; scheduledAt: number | null; predictedAt: number | null;
  alliances: { red: number[]; blue: number[] };
  result: { winningAlliance?: string } | null;
};

function matchLabel(match: EventMatch) {
  const prefix: Record<string, string> = { qm: 'Q', ef: 'EF', qf: 'QF', sf: 'SF', f: 'F' };
  return `${prefix[match.compLevel] ?? match.compLevel.toUpperCase()}${match.matchNumber}`;
}

type MatchDraft = {
  autoFuel: number;
  activeFuel: number;
  inactiveFuel: number;
  cycles: number;
  autoTower: string;
  tower: string;
  path: string;
};

function Counter({ label, hint, value, onChange, quickAdds = [] }: { label: string; hint: string; value: number; onChange: (value: number) => void; quickAdds?: number[] }) {
  return <div className="counter-row"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div><div className="counter-controls">{quickAdds.map((amount) => <Button type="button" key={amount} variant="outline" onClick={() => onChange(value + amount)}>+{amount}</Button>)}<Button type="button" aria-label={`Remove one ${label}`} size="icon-lg" variant="outline" onClick={() => onChange(Math.max(0, value - 1))}><Minus /></Button><input aria-label={`${label} total`} className="counter-input" type="number" inputMode="numeric" min="0" value={value} onChange={(event) => onChange(Math.max(0, Number.parseInt(event.target.value, 10) || 0))} /><Button type="button" aria-label={`Add one ${label}`} size="icon-lg" onClick={() => onChange(value + 1)}><Plus /></Button></div></div>;
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [activeView, setActiveView] = useState<View>('Scout');
  const [autoFuel, setAutoFuel] = useState(0); const [activeFuel, setActiveFuel] = useState(0); const [inactiveFuel, setInactiveFuel] = useState(0); const [cycles, setCycles] = useState(0);
  const [autoTower, setAutoTower] = useState('None'); const [tower, setTower] = useState('None'); const [path, setPath] = useState('Trench'); const [dark, setDark] = useState(false); const [saved, setSaved] = useState(false);
  const [draftReady, setDraftReady] = useState(false); const [queuedCount, setQueuedCount] = useState(0); const [saveError, setSaveError] = useState('');
  const [online, setOnline] = useState(true); const [syncing, setSyncing] = useState(false); const [syncMessage, setSyncMessage] = useState('');
  const [eventKey, setEventKey] = useState('2026vablacksburg'); const [eventMessage, setEventMessage] = useState(''); const [configuringEvent, setConfiguringEvent] = useState(false);
  const [eventPack, setEventPack] = useState<EventPack | null>(null); const [packLoading, setPackLoading] = useState(false); const [packError, setPackError] = useState('');
  const [selectedMatchKey, setSelectedMatchKey] = useState(''); const [selectedTeam, setSelectedTeam] = useState<number | null>(null); const [selectedStation, setSelectedStation] = useState('');
  const currentMatch = eventPack?.matches.find((match) => match.key === selectedMatchKey);
  const draftId = eventPack && currentMatch && selectedTeam ? `${eventPack.event.key}-${currentMatch.key}-${selectedTeam}` : null;
  const eventTeams = eventPack ? [...new Set(eventPack.matches.flatMap((match) => [...match.alliances.red, ...match.alliances.blue]))].sort((a, b) => a - b) : [];
  const estimatedPoints = autoFuel + activeFuel + (autoTower === 'Level 1' ? 15 : 0) + (tower === 'Level 3' ? 30 : tower === 'Level 2' ? 20 : tower === 'Level 1' ? 10 : 0);

  useEffect(() => { getPendingMutations().then((pending) => setQueuedCount(pending.length)).catch(() => setSaveError('Offline storage is unavailable on this device.')); }, []);

  useEffect(() => {
    if (!draftId) { setDraftReady(false); return; }
    setDraftReady(false); setSaved(false);
    getDraft<MatchDraft>(draftId).then((draft) => {
      if (draft) {
        setAutoFuel(draft.payload.autoFuel); setActiveFuel(draft.payload.activeFuel); setInactiveFuel(draft.payload.inactiveFuel); setCycles(draft.payload.cycles);
        setAutoTower(draft.payload.autoTower); setTower(draft.payload.tower); setPath(draft.payload.path);
      } else {
        setAutoFuel(0); setActiveFuel(0); setInactiveFuel(0); setCycles(0); setAutoTower('None'); setTower('None'); setPath('Trench');
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
    if (!draftReady || !draftId) return;
    const timer = window.setTimeout(() => {
      saveDraft({ id: draftId, payload: { autoFuel, activeFuel, inactiveFuel, cycles, autoTower, tower, path }, updatedAt: Date.now() })
        .then(() => setSaveError('')).catch(() => setSaveError('Could not save this draft offline.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeFuel, autoFuel, autoTower, cycles, draftId, draftReady, inactiveFuel, path, tower]);

  async function submitMatch() {
    if (!draftId || !eventPack || !currentMatch || !selectedTeam) { setSaveError('Choose a match and team from the schedule first.'); return; }
    setSaveError('');
    try {
      await queueMutation({
        id: `scout-entry:${draftId}:${session?.user.id ?? 'local'}`,
        organizationId: 'team-401', entity: 'scoutEntry', operation: 'upsert', createdAt: Date.now(), attempts: 0,
        payload: { eventKey: eventPack.event.key, matchKey: currentMatch.key, teamNumber: selectedTeam, station: selectedStation, seasonYear: eventPack.event.year, schemaVersion: 1, autoFuel, activeFuel, inactiveFuel, cycles, autoTower, tower, path },
      });
      setQueuedCount((await getPendingMutations()).length); setSaved(true);
    } catch {
      setSaveError('Could not queue this match for synchronization.');
    }
  }

  async function loadEventPack() {
    setPackLoading(true); setPackError('');
    try {
      const response = await fetch('/api/event-pack');
      const result = await response.json() as EventPack & { error?: string; event: EventPack['event'] | null };
      if (!response.ok) throw new Error(result.error ?? 'Unable to load the event pack.');
      if (!result.event) { setEventPack(null); return; }
      const pack = result as EventPack;
      setEventPack(pack); setEventKey(pack.event.key);
      if (!selectedMatchKey && pack.matches.length > 0) selectAssignment(pack.matches[0], pack.matches[0].alliances.red[0], 'red1');
    } catch (error) {
      setPackError(error instanceof Error ? error.message : 'Unable to load the event pack.');
    } finally {
      setPackLoading(false);
    }
  }

  function selectAssignment(match: EventMatch, team: number, station: string) {
    setSelectedMatchKey(match.key); setSelectedTeam(team); setSelectedStation(station); setSaved(false); setActiveView('Scout');
  }

  async function syncNow() {
    if (!session) { setSyncMessage('Sign in before synchronizing.'); return; }
    if (!online) { setSyncMessage('This device is offline. Your entries are still safe.'); return; }
    setSyncing(true); setSyncMessage('');
    try {
      const result = await synchronizePendingMutations();
      setQueuedCount(result.pending);
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

  return <main className={dark ? 'dark app-shell' : 'app-shell'}>
    <aside className="desktop-nav"><div className="brand-mark">401</div><nav aria-label="Primary navigation" className="mt-8 grid gap-2">{nav.map(({ label, icon: Icon }) => <button type="button" aria-current={activeView === label ? 'page' : undefined} onClick={() => setActiveView(label)} className={activeView === label ? 'nav-item active' : 'nav-item'} key={label}><Icon /><span>{label}</span></button>)}</nav><button type="button" aria-current={activeView === 'Settings' ? 'page' : undefined} onClick={() => setActiveView('Settings')} className={activeView === 'Settings' ? 'nav-item active mt-auto' : 'nav-item mt-auto'}><Settings /><span>Settings</span></button></aside>
    <section className="min-w-0 flex-1"><header className="topbar"><div><p className="eyebrow">{eventPack?.event.name ?? 'Team 401'}</p><h1>{activeView === 'Scout' ? currentMatch ? matchLabel(currentMatch) : 'Choose an assignment' : activeView}</h1></div><div className="flex items-center gap-2"><Badge variant="outline" className="status-badge">{online ? <Cloud /> : <CloudOff />}{online ? 'Online' : 'Offline ready'}</Badge>{!isPending && (session ? <Button variant="outline" onClick={() => authClient.signOut().then(() => window.location.reload())}><LogOut />{session.user.name}</Button> : <Button nativeButton={false} render={<a href="/sign-in" />}>Sign in</Button>)}<Button aria-label="Toggle color theme" size="icon" variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button></div></header>
      {activeView === 'Scout' && <div className="content-grid"><div className="min-w-0 space-y-4">
        <Card className="match-card"><CardContent className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="station-dot" /><div><p className="eyebrow">{selectedStation ? `${selectedStation.replace(/(red|blue)/, '$1 ')} · Selected assignment` : 'No assignment selected'}</p><p className="text-2xl font-bold">{selectedTeam ? `Team ${selectedTeam}` : 'Open the schedule'}</p></div></div><div className="text-right"><p className="text-xs text-muted-foreground">{eventPack?.event.year ?? 2026} REBUILT</p><p className="font-mono text-lg font-bold text-primary">{currentMatch?.predictedAt ? new Date(currentMatch.predictedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</p></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Autonomous · 20 seconds</CardTitle><Badge variant="secondary"><Zap /> HUB active</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="FUEL scored" hint="Use +5 for a burst, then adjust or type the total" value={autoFuel} onChange={setAutoFuel} quickAdds={[5]} /><div className="choice-section"><span><strong>Auto TOWER</strong><small>LEVEL 1 only</small></span><div className="two-choices">{['None', 'Level 1'].map((item) => <button type="button" onClick={() => setAutoTower(item)} key={item} className={autoTower === item ? 'choice selected' : 'choice'}>{autoTower === item && <Check />}{item}</button>)}</div></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Teleoperated FUEL</CardTitle><Badge variant="outline">Shift-aware</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="Active HUB FUEL" hint="Add observed bursts with +5 or +10; fine-tune anytime" value={activeFuel} onChange={setActiveFuel} quickAdds={[5, 10]} /><Counter label="Inactive HUB attempts" hint="Useful efficiency and awareness signal" value={inactiveFuel} onChange={setInactiveFuel} quickAdds={[5]} /><Counter label="Scoring cycles" hint="Intake → shoot cycles completed" value={cycles} onChange={setCycles} /></CardContent></Card>
        <div className="form-pair"><Card><CardHeader><CardTitle><Gauge /> Field movement</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2">{['Trench', 'Bump', 'Both'].map((item) => <button key={item} onClick={() => setPath(item)} className={path === item ? 'choice selected' : 'choice'}>{path === item && <Check />}{item}</button>)}</CardContent></Card><Card><CardHeader><CardTitle><Shield /> Defense</CardTitle></CardHeader><CardContent className="rating-row">{[0,1,2,3].map((rating) => <button key={rating}>{rating}</button>)}</CardContent></Card></div>
        <Card><CardHeader className="border-b"><CardTitle><TowerControl /> Endgame TOWER</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['None', 'Level 1', 'Level 2', 'Level 3'].map((item) => <button onClick={() => setTower(item)} key={item} className={tower === item ? 'choice selected' : 'choice'}>{tower === item && <Check />}{item}</button>)}</CardContent></Card>
        {saveError && <p role="alert" className="auth-error">{saveError}</p>}<Button className="h-12 w-full text-base" disabled={!draftReady} onClick={submitMatch}>{saved ? <><Check /> Queued for sync · {estimatedPoints} pts observed</> : draftReady ? <>Save match offline <ChevronRight /></> : <>Opening offline storage…</>}</Button>
      </div><aside className="right-rail"><Card className="score-card"><CardHeader><CardTitle>Observed output</CardTitle><Badge className="live-badge"><Radio />Live</Badge></CardHeader><CardContent><p className="score-number">{estimatedPoints}</p><p className="text-sm text-muted-foreground">estimated contributed points</p><div className="mini-stats"><span><strong>{activeFuel}</strong> active FUEL</span><span><strong>{Math.round(activeFuel / Math.max(cycles,1))}</strong> FUEL / cycle</span></div></CardContent></Card><Card><CardHeader><CardTitle>Offline queue</CardTitle><Badge variant="outline"><CloudOff />{queuedCount} pending</Badge></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Draft changes save automatically. Submitted matches remain on this device until synchronization is available.</p><Button className="w-full" variant="outline" disabled={syncing || queuedCount === 0} onClick={syncNow}><Cloud />{syncing ? 'Synchronizing…' : 'Sync now'}</Button>{syncMessage && <p className="text-xs text-muted-foreground" role="status">{syncMessage}</p>}</CardContent></Card><Card><CardHeader><CardTitle>Up next</CardTitle></CardHeader><CardContent className="space-y-1">{eventPack?.matches.slice(Math.max(0, eventPack.matches.findIndex((match) => match.key === selectedMatchKey) + 1), Math.max(0, eventPack.matches.findIndex((match) => match.key === selectedMatchKey) + 1) + 3).map((match) => <button className="schedule-row w-full text-left" onClick={() => setActiveView('Schedule')} key={match.key}><strong>{matchLabel(match)}</strong><span>{match.alliances.red.join(', ')}</span><small>vs {match.alliances.blue.join(', ')}</small></button>)}</CardContent></Card><Card><CardContent className="space-y-2"><p className="eyebrow">Event pack</p><strong>{eventPack?.event.name ?? 'No current event'}</strong><p className="text-xs text-muted-foreground">{eventPack ? `${eventPack.matches.length} matches and ${eventTeams.length} teams cached.` : 'Set a current event in Settings.'}</p></CardContent></Card></aside></div>}
      {activeView === 'Schedule' && <div className="p-4 sm:p-6"><Card><CardHeader><CardTitle>{eventPack?.event.name ?? 'Match schedule'}</CardTitle><Badge variant="outline">{eventPack?.matches.length ?? 0} matches</Badge></CardHeader><CardContent className="space-y-3">{packLoading && <p className="text-sm text-muted-foreground">Loading event pack…</p>}{packError && <p className="auth-error">{packError}</p>}{eventPack?.matches.map((match) => <div className="rounded-lg border p-3" key={match.key}><div className="mb-2 flex items-center justify-between"><strong>{matchLabel(match)}</strong><small className="text-muted-foreground">{match.predictedAt ? new Date(match.predictedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Time TBD'}</small></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><div className="grid grid-cols-3 gap-2">{match.alliances.red.map((team, index) => <button className="choice border-red-300" onClick={() => selectAssignment(match, team, `red${index + 1}`)} key={team}>R{index + 1} · {team}</button>)}</div><div className="grid grid-cols-3 gap-2">{match.alliances.blue.map((team, index) => <button className="choice border-blue-300" onClick={() => selectAssignment(match, team, `blue${index + 1}`)} key={team}>B{index + 1} · {team}</button>)}</div></div></div>)}{!packLoading && !eventPack && <p className="text-sm text-muted-foreground">No event pack is loaded. An owner or admin can load one in Settings.</p>}</CardContent></Card></div>}
      {activeView === 'Teams' && <div className="p-4 sm:p-6"><Card><CardHeader><CardTitle>Teams at {eventPack?.event.name ?? 'this event'}</CardTitle><Badge variant="outline">{eventTeams.length} teams</Badge></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{eventTeams.map((team) => <button onClick={() => { setSelectedTeam(team); setActiveView('Analysis'); }} className="schedule-row w-full text-left" key={team}><strong>Team {team}</strong><span>{eventPack?.matches.filter((match) => [...match.alliances.red, ...match.alliances.blue].includes(team)).length} matches</span><ChevronRight /></button>)}</CardContent></Card></div>}
      {activeView === 'Analysis' && <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6"><Card><CardHeader><CardTitle>{selectedTeam ? `Team ${selectedTeam} snapshot` : 'Select a team'}</CardTitle></CardHeader><CardContent><p className="score-number">{estimatedPoints}</p><p className="text-sm text-muted-foreground">current observed points</p></CardContent></Card><Card><CardHeader><CardTitle>Scheduled matches</CardTitle></CardHeader><CardContent className="mini-stats"><span><strong>{selectedTeam && eventPack ? eventPack.matches.filter((match) => [...match.alliances.red, ...match.alliances.blue].includes(selectedTeam)).length : 0}</strong> appearances</span><span><strong>{queuedCount}</strong> local entries</span></CardContent></Card></div>}
      {activeView === 'Settings' && <div className="grid gap-4 p-4 sm:p-6"><Card><CardHeader><CardTitle>Current event</CardTitle></CardHeader><CardContent className="space-y-3"><div><p className="font-semibold">TBA event key</p><p className="text-sm text-muted-foreground">Owners and admins control the event pack used by every scout.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="TBA event key" value={eventKey} onChange={(event) => setEventKey(event.target.value)} placeholder="2026vablacksburg" /><Button disabled={configuringEvent || !online || !session} onClick={configureEvent}>{configuringEvent ? 'Loading…' : 'Load event pack'}</Button></div>{eventMessage && <p className="text-sm text-muted-foreground" role="status">{eventMessage}</p>}</CardContent></Card><Card><CardHeader><CardTitle>Display settings</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-4"><div><p className="font-semibold">Color theme</p><p className="text-sm text-muted-foreground">Choose the theme for this device.</p></div><Button variant="outline" onClick={() => setDark(!dark)}>{dark ? <><Sun />Use light mode</> : <><Moon />Use dark mode</>}</Button></CardContent></Card></div>}
    </section><nav aria-label="Mobile navigation" className="mobile-nav">{nav.map(({ label, icon: Icon }) => <button type="button" aria-current={activeView === label ? 'page' : undefined} onClick={() => setActiveView(label)} className={activeView === label ? 'active' : ''} key={label}><Icon /><span>{label}</span></button>)}</nav>
  </main>;
}
