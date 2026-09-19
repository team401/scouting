'use client';

import { useState } from 'react';
import { BarChart3, CalendarDays, Check, ChevronRight, ClipboardList, CloudOff, Gauge, LogOut, Minus, Moon, Plus, Radio, Settings, Shield, Sun, TowerControl, Users, Zap } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const nav = [
  { label: 'Scout', icon: ClipboardList, active: true }, { label: 'Schedule', icon: CalendarDays },
  { label: 'Teams', icon: Users }, { label: 'Analysis', icon: BarChart3 },
];

function Counter({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (value: number) => void }) {
  return <div className="counter-row"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{hint}</p></div><div className="flex items-center gap-2"><Button aria-label={`Remove one ${label}`} size="icon-lg" variant="outline" onClick={() => onChange(Math.max(0, value - 1))}><Minus /></Button><output className="w-10 text-center font-mono text-2xl font-bold tabular-nums">{value}</output><Button aria-label={`Add one ${label}`} size="icon-lg" onClick={() => onChange(value + 1)}><Plus /></Button></div></div>;
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [autoFuel, setAutoFuel] = useState(7); const [activeFuel, setActiveFuel] = useState(42); const [inactiveFuel, setInactiveFuel] = useState(4); const [cycles, setCycles] = useState(6);
  const [tower, setTower] = useState('Level 2'); const [path, setPath] = useState('Trench'); const [dark, setDark] = useState(false); const [saved, setSaved] = useState(false);
  const estimatedPoints = autoFuel + activeFuel + (tower === 'Level 3' ? 30 : tower === 'Level 2' ? 20 : tower === 'Level 1' ? 10 : 0);

  return <main className={dark ? 'dark app-shell' : 'app-shell'}>
    <aside className="desktop-nav"><div className="brand-mark">401</div><nav aria-label="Primary navigation" className="mt-8 grid gap-2">{nav.map(({ label, icon: Icon, active }) => <button className={active ? 'nav-item active' : 'nav-item'} key={label}><Icon /><span>{label}</span></button>)}</nav><button className="nav-item mt-auto"><Settings /><span>Settings</span></button></aside>
    <section className="min-w-0 flex-1"><header className="topbar"><div><p className="eyebrow">Team 401 · Copperhead Robotics</p><h1>Qualification 18</h1></div><div className="flex items-center gap-2"><Badge variant="outline" className="status-badge"><CloudOff />Offline ready</Badge>{!isPending && (session ? <Button variant="outline" onClick={() => authClient.signOut().then(() => window.location.reload())}><LogOut />{session.user.name}</Button> : <Button nativeButton={false} render={<a href="/sign-in" />}>Sign in</Button>)}<Button aria-label="Toggle color theme" size="icon" variant="ghost" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button></div></header>
      <div className="content-grid"><div className="min-w-0 space-y-4">
        <Card className="match-card"><CardContent className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="station-dot" /><div><p className="eyebrow">Red 2 · Your assignment</p><p className="text-2xl font-bold">Team 6328</p></div></div><div className="text-right"><p className="text-xs text-muted-foreground">2026 REBUILT</p><p className="font-mono text-lg font-bold text-primary">08:42</p></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Autonomous · 20 seconds</CardTitle><Badge variant="secondary"><Zap /> HUB active</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="FUEL scored" hint="Count successful HUB shots" value={autoFuel} onChange={setAutoFuel} /><div className="choice-section"><span><strong>Auto TOWER</strong><small>LEVEL 1 only</small></span><div className="two-choices">{['None', 'Level 1'].map((item) => <button key={item} className={item === 'Level 1' ? 'choice selected' : 'choice'}>{item === 'Level 1' && <Check />}{item}</button>)}</div></div></CardContent></Card>
        <Card><CardHeader className="border-b"><CardTitle>Teleoperated FUEL</CardTitle><Badge variant="outline">Shift-aware</Badge></CardHeader><CardContent className="divide-y divide-border p-0"><Counter label="Active HUB FUEL" hint="Scored while alliance HUB is active" value={activeFuel} onChange={setActiveFuel} /><Counter label="Inactive HUB attempts" hint="Useful efficiency and awareness signal" value={inactiveFuel} onChange={setInactiveFuel} /><Counter label="Scoring cycles" hint="Intake → shoot cycles completed" value={cycles} onChange={setCycles} /></CardContent></Card>
        <div className="form-pair"><Card><CardHeader><CardTitle><Gauge /> Field movement</CardTitle></CardHeader><CardContent className="grid grid-cols-3 gap-2">{['Trench', 'Bump', 'Both'].map((item) => <button key={item} onClick={() => setPath(item)} className={path === item ? 'choice selected' : 'choice'}>{path === item && <Check />}{item}</button>)}</CardContent></Card><Card><CardHeader><CardTitle><Shield /> Defense</CardTitle></CardHeader><CardContent className="rating-row">{[0,1,2,3].map((rating) => <button key={rating}>{rating}</button>)}</CardContent></Card></div>
        <Card><CardHeader className="border-b"><CardTitle><TowerControl /> Endgame TOWER</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['None', 'Level 1', 'Level 2', 'Level 3'].map((item) => <button onClick={() => setTower(item)} key={item} className={tower === item ? 'choice selected' : 'choice'}>{tower === item && <Check />}{item}</button>)}</CardContent></Card>
        <Button className="h-12 w-full text-base" onClick={() => setSaved(true)}>{saved ? <><Check /> Saved offline · {estimatedPoints} pts observed</> : <>Save match <ChevronRight /></>}</Button>
      </div><aside className="right-rail"><Card className="score-card"><CardHeader><CardTitle>Observed output</CardTitle><Badge className="live-badge"><Radio />Live</Badge></CardHeader><CardContent><p className="score-number">{estimatedPoints}</p><p className="text-sm text-muted-foreground">estimated contributed points</p><div className="mini-stats"><span><strong>{activeFuel}</strong> active FUEL</span><span><strong>{Math.round(activeFuel / Math.max(cycles,1))}</strong> FUEL / cycle</span></div></CardContent></Card><Card><CardHeader><CardTitle>Up next</CardTitle></CardHeader><CardContent className="space-y-1">{[['Q19','Team 1058','Red 1'],['Q20','Team 3467','Blue 3'],['Q21','Team 401','Blue 1']].map(([match,team,station]) => <div className="schedule-row" key={match}><strong>{match}</strong><span>{team}</span><small>{station}</small></div>)}</CardContent></Card><Card><CardContent className="space-y-2"><p className="eyebrow">Event pack</p><strong>2026 Blacksburg VA</strong><p className="text-xs text-muted-foreground">Schedule, teams, assignments, and game definition cached on this device.</p></CardContent></Card></aside></div>
    </section><nav aria-label="Mobile navigation" className="mobile-nav">{nav.map(({ label, icon: Icon, active }) => <button className={active ? 'active' : ''} key={label}><Icon /><span>{label}</span></button>)}</nav>
  </main>;
}
