'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map,
  Minus,
  MonitorSmartphone,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Sun,
  TowerControl,
  Trash2,
  Upload,
  UserCog,
  Users,
  WandSparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  initialRobotMarkers,
  TacticalBoard,
  type TacticalBoardData,
} from '@/components/tactical-board';
import { PickListWorkspace } from '@/components/pick-list-workspace';
import { MatchVideoLibrary } from '@/components/match-video-library';
import { TeamComparison } from '@/components/team-comparison';
import { TeamTrendChart, type TeamTrend } from '@/components/team-trend-chart';
import { ScoutingOperations } from '@/components/scouting-operations';
import { OfflineReadiness } from '@/components/offline-readiness';
import { QrRelay } from '@/components/qr-relay';
import {
  getCachedValue,
  getDraft,
  getPendingMutations,
  queueMutation,
  saveCachedValue,
  saveDraft,
  synchronizePendingMutations,
} from '@/lib/offline-db';
import { observedPoints, type ScoutingPayload } from '@/lib/scouting-metrics';
import {
  canManageAssignments,
  canReopenEntries,
  scoutEntryMutationId,
} from '@/lib/scouting-policy';

type View = 'Home' | 'Scout' | 'Pit' | 'Plan' | 'Teams' | 'Admin' | 'Settings';

const nav: {
  label: Exclude<View, 'Settings' | 'Admin'>;
  icon: typeof ClipboardList;
}[] = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Scout', icon: ClipboardList },
  { label: 'Pit', icon: Wrench },
  { label: 'Plan', icon: Map },
  { label: 'Teams', icon: Users },
];

type EventPack = {
  event: {
    id: string;
    year: number;
    key: string;
    name: string;
    updatedAt: number;
  };
  matches: EventMatch[];
  assignments: {
    matchId: string;
    teamNumber: number;
    scoutUserId: string;
    station: string;
  }[];
  members: {
    id: string;
    name: string;
    email: string;
    role: string;
    disabled?: number | boolean;
  }[];
  pitEntries: PitEntry[];
  organizationId: string;
  organizationTeamNumber: number;
  role: string;
  userId: string;
};

type PitDraft = {
  drivetrain: string;
  swerveModule: string;
  motorTypes: string;
  weightLbs: number;
  widthInches: number;
  lengthInches: number;
  heightInches: number;
  fuelCapacity: number;
  climbCapability: string;
  autonomousCapabilities: string;
  notes: string;
};
type PitEntry = {
  teamNumber: number;
  drivetrain: string | null;
  swerveModule: string | null;
  motorTypes: string[];
  weightLbs: number | null;
  dimensions: { width?: number; length?: number; height?: number } | null;
  payload: Partial<PitDraft>;
  photoObjectKey: string | null;
  updatedAt: number;
};
const emptyPitDraft: PitDraft = {
  drivetrain: 'Swerve',
  swerveModule: '',
  motorTypes: '',
  weightLbs: 0,
  widthInches: 0,
  lengthInches: 0,
  heightInches: 0,
  fuelCapacity: 0,
  climbCapability: 'None',
  autonomousCapabilities: '',
  notes: '',
};

type EventMatch = {
  id: string;
  key: string;
  compLevel: string;
  matchNumber: number;
  scheduledAt: number | null;
  predictedAt: number | null;
  alliances: { red: number[]; blue: number[] };
  result: {
    winningAlliance?: string | null;
    actualTime?: number | null;
    redScore?: number | null;
    blueScore?: number | null;
  } | null;
};

function matchLabel(match: EventMatch) {
  const prefix: Record<string, string> = {
    qm: 'Q',
    ef: 'EF',
    qf: 'QF',
    sf: 'SF',
    f: 'F',
  };
  return `${prefix[match.compLevel] ?? match.compLevel.toUpperCase()}${match.matchNumber}`;
}

type MatchDraft = ScoutingPayload;

type TeamAnalysis = {
  teamNumber: number;
  epa: number | null;
  opr: number | null;
  samples: number;
  scheduledMatches: number;
  coverage: number;
  medianPoints: number;
  medianActiveFuel: number;
  medianFuelPerCycle: number;
  towerSuccessRate: number;
  disabledRate: number;
  averageDefense: number;
  pointStdDev: number;
  trends?: TeamTrend[];
  entries: {
    id: string;
    matchKey: string;
    scoutName: string;
    reopened: boolean;
  }[];
};
type TbaEventChoice = {
  key: string;
  name: string;
  date: string | null;
  location: string;
};
type MatchPlan = {
  objective: string;
  autonomous: string;
  offense: string;
  defense: string;
  endgame: string;
  notes: string;
  teamRoles: Record<string, string>;
  board: TacticalBoardData;
};
const emptyMatchPlan: MatchPlan = {
  objective: '',
  autonomous: '',
  offense: '',
  defense: '',
  endgame: '',
  notes: '',
  teamRoles: {},
  board: { robots: [], strokes: [] },
};

function planForMatch(
  plan: Partial<MatchPlan> | null | undefined,
  match: EventMatch,
): MatchPlan {
  return {
    ...emptyMatchPlan,
    ...plan,
    teamRoles: plan?.teamRoles ?? {},
    board: plan?.board?.robots?.length
      ? plan.board
      : {
          robots: initialRobotMarkers(
            match.alliances.red,
            match.alliances.blue,
          ),
          strokes: [],
        },
  };
}

function Counter({
  label,
  hint,
  value,
  onChange,
  quickAdds = [],
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  quickAdds?: number[];
}) {
  return (
    <div className="counter-row">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="counter-controls">
        {quickAdds.map((amount) => (
          <Button
            type="button"
            key={amount}
            variant="outline"
            onClick={() => onChange(value + amount)}
          >
            +{amount}
          </Button>
        ))}
        <Button
          type="button"
          aria-label={`Remove one ${label}`}
          size="icon-lg"
          variant="outline"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </Button>
        <input
          aria-label={`${label} total`}
          className="counter-input"
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          onChange={(event) =>
            onChange(Math.max(0, Number.parseInt(event.target.value, 10) || 0))
          }
        />
        <Button
          type="button"
          aria-label={`Add one ${label}`}
          size="icon-lg"
          onClick={() => onChange(value + 1)}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [activeView, setActiveView] = useState<View>('Home');
  const [viewHistory, setViewHistory] = useState<View[]>(['Home']);
  const [autoFuel, setAutoFuel] = useState(0);
  const [activeFuel, setActiveFuel] = useState(0);
  const [inactiveFuel, setInactiveFuel] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [autoTower, setAutoTower] = useState('None');
  const [tower, setTower] = useState('None');
  const [path, setPath] = useState('Trench');
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState(false);
  const [defenseRating, setDefenseRating] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [noShow, setNoShow] = useState(false);
  const [penalties, setPenalties] = useState(0);
  const [shootingRange, setShootingRange] = useState('Mixed');
  const [cycleSeconds, setCycleSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [eventKey, setEventKey] = useState('');
  const [eventMessage, setEventMessage] = useState('');
  const [configuringEvent, setConfiguringEvent] = useState(false);
  const [eventYear, setEventYear] = useState(2026);
  const [eventChoices, setEventChoices] = useState<TbaEventChoice[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventPack, setEventPack] = useState<EventPack | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState('');
  const [selectedMatchKey, setSelectedMatchKey] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState('');
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [strategyTeams, setStrategyTeams] = useState<TeamAnalysis[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [accountSessions, setAccountSessions] = useState<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: number;
      updatedAt: number;
      expiresAt: number;
    }>
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [storedInviteCode, setStoredInviteCode] = useState<string | null>(null);
  const [inviteCodeVisible, setInviteCodeVisible] = useState(false);
  const [inviteCodeConfigured, setInviteCodeConfigured] = useState(false);
  const [inviteCodeBusy, setInviteCodeBusy] = useState(false);
  const [inviteCodeMessage, setInviteCodeMessage] = useState('');
  const [tbaVerification, setTbaVerification] = useState<{
    verificationCode: string;
    receivedAt: number;
  } | null>(null);
  const [tbaWebhookStatus, setTbaWebhookStatus] = useState<{
    configured: boolean;
    delivery: {
      lastReceivedAt: number;
      status: string;
      messageType: string | null;
    } | null;
  }>({ configured: false, delivery: null });
  const [tbaVerificationMessage, setTbaVerificationMessage] = useState('');
  const [adminSection, setAdminSection] = useState<'settings' | 'assignments'>(
    'settings',
  );
  const [selectedScoutIds, setSelectedScoutIds] = useState<string[]>([]);
  const [assignmentStart, setAssignmentStart] = useState(1);
  const [assignmentEnd, setAssignmentEnd] = useState(999);
  const [scheduleFilter, setScheduleFilter] = useState<
    'all' | 'mine' | 'unassigned'
  >('all');
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [pitTeam, setPitTeam] = useState<number | null>(null);
  const [pitDraft, setPitDraft] = useState<PitDraft>(emptyPitDraft);
  const [pitReady, setPitReady] = useState(false);
  const [pitMessage, setPitMessage] = useState('');
  const [pitPhoto, setPitPhoto] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [matchPlan, setMatchPlan] = useState<MatchPlan>(emptyMatchPlan);
  const [planCanEdit, setPlanCanEdit] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planMessage, setPlanMessage] = useState('');
  const [planAuthor, setPlanAuthor] = useState('');
  const [planStats, setPlanStats] = useState<TeamAnalysis[]>([]);
  const organizationTeamNumber = eventPack?.organizationTeamNumber ?? 401;
  const planningMatches =
    eventPack?.matches.filter((match) =>
      [...match.alliances.red, ...match.alliances.blue].includes(
        organizationTeamNumber,
      ),
    ) ?? [];
  const currentMatch = eventPack?.matches.find(
    (match) => match.key === selectedMatchKey,
  );
  const draftId =
    eventPack && currentMatch && selectedTeam
      ? `${eventPack.event.key}-${currentMatch.key}-${selectedTeam}`
      : null;
  const mutationId =
    eventPack && currentMatch && selectedTeam
      ? scoutEntryMutationId(
          eventPack.event.key,
          currentMatch.key,
          selectedTeam,
          session?.user.id ?? 'local',
        )
      : null;
  const [submissionStatus, setSubmissionStatus] = useState<
    'draft' | 'queued' | 'synchronized' | 'rejected'
  >('draft');
  const eventTeams = eventPack
    ? [
        ...new Set(
          eventPack.matches.flatMap((match) => [
            ...match.alliances.red,
            ...match.alliances.blue,
          ]),
        ),
      ].sort((a, b) => a - b)
    : [];
  const currentPayload: ScoutingPayload = {
    autoFuel,
    activeFuel,
    inactiveFuel,
    cycles,
    autoTower,
    tower,
    path,
    defenseRating,
    disabled,
    noShow,
    penalties,
    shootingRange,
    cycleSeconds,
    notes,
  };
  const estimatedPoints = observedPoints(currentPayload);
  const pitDraftId =
    eventPack && pitTeam ? `pit-${eventPack.event.key}-${pitTeam}` : null;
  const existingPitPhoto = pitTeam
    ? eventPack?.pitEntries.find((entry) => entry.teamNumber === pitTeam)
        ?.photoObjectKey
    : null;
  const isAdmin = Boolean(eventPack && canManageAssignments(eventPack.role));
  const canUseStrategy = Boolean(eventPack && canReopenEntries(eventPack.role));
  const visibleNav = nav;

  function navigate(view: View) {
    if (view === activeView) return;
    setViewHistory((history) => [...history, view]);
    setActiveView(view);
  }

  function goBack() {
    setViewHistory((history) => {
      if (history.length <= 1) {
        setActiveView('Home');
        return ['Home'];
      }
      const next = history.slice(0, -1);
      setActiveView(next[next.length - 1]);
      return next;
    });
  }

  useEffect(() => {
    getPendingMutations()
      .then((pending) => setQueuedCount(pending.length))
      .catch(() =>
        setSaveError('Offline storage is unavailable on this device.'),
      );
  }, []);

  useEffect(() => {
    if (!draftId) {
      setDraftReady(false);
      return;
    }
    setDraftReady(false);
    setSaved(false);
    setSubmissionStatus('draft');
    getDraft<MatchDraft>(draftId)
      .then((draft) => {
        if (draft) {
          setAutoFuel(draft.payload.autoFuel);
          setActiveFuel(draft.payload.activeFuel);
          setInactiveFuel(draft.payload.inactiveFuel);
          setCycles(draft.payload.cycles);
          setAutoTower(draft.payload.autoTower);
          setTower(draft.payload.tower);
          setPath(draft.payload.path);
          setDefenseRating(draft.payload.defenseRating ?? 0);
          setDisabled(draft.payload.disabled ?? false);
          setNoShow(draft.payload.noShow ?? false);
          setPenalties(draft.payload.penalties ?? 0);
          setShootingRange(draft.payload.shootingRange ?? 'Mixed');
          setCycleSeconds(draft.payload.cycleSeconds ?? 0);
          setNotes(draft.payload.notes ?? '');
        } else {
          setAutoFuel(0);
          setActiveFuel(0);
          setInactiveFuel(0);
          setCycles(0);
          setAutoTower('None');
          setTower('None');
          setPath('Trench');
          setDefenseRating(0);
          setDisabled(false);
          setNoShow(false);
          setPenalties(0);
          setShootingRange('Mixed');
          setCycleSeconds(0);
          setNotes('');
        }
        setDraftReady(true);
      })
      .catch(() => {
        setSaveError('Offline storage is unavailable on this device.');
        setDraftReady(true);
      });
  }, [draftId]);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    updateConnection();
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    if (session) void loadEventPack();
  }, [session]);

  useEffect(() => {
    if (!session || !online) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadEventPack(true);
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [online, session]);

  useEffect(() => {
    if (!online || !session || queuedCount === 0 || syncing) return;
    const timer = window.setTimeout(() => void syncNow(), 1000);
    return () => window.clearTimeout(timer);
  }, [online, queuedCount, session]);

  useEffect(() => {
    if (activeView !== 'Plan' || !canUseStrategy || !selectedTeam || !online)
      return;
    fetch(`/api/analysis?team=${selectedTeam}`)
      .then(async (response) => {
        const result = (await response.json()) as TeamAnalysis & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Analysis unavailable.');
        setAnalysis(result);
      })
      .catch(() => setAnalysis(null));
  }, [activeView, online, selectedTeam]);

  useEffect(() => {
    if (activeView !== 'Plan' || !canUseStrategy || !online || !session) return;
    fetch('/api/strategy')
      .then(async (response) => {
        const result = (await response.json()) as {
          teams?: TeamAnalysis[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Strategy data unavailable.');
        setStrategyTeams(result.teams ?? []);
      })
      .catch(() => setStrategyTeams([]));
  }, [activeView, online, session]);

  useEffect(() => {
    if (activeView === 'Admin' && !isAdmin) {
      setActiveView('Home');
      setViewHistory(['Home']);
    }
  }, [activeView, canUseStrategy, isAdmin]);

  useEffect(() => {
    if (activeView !== 'Admin' || !isAdmin || !online) return;
    setEventsLoading(true);
    setEventMessage('');
    fetch(`/api/tba-events?year=${eventYear}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          events?: TbaEventChoice[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Unable to load Team 401 events.');
        setEventChoices(result.events ?? []);
      })
      .catch((error) => {
        setEventChoices([]);
        setEventMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load Team 401 events.',
        );
      })
      .finally(() => setEventsLoading(false));
  }, [activeView, eventYear, isAdmin, online]);

  useEffect(() => {
    if (activeView !== 'Admin' || !isAdmin || !online) return;
    fetch('/api/invite-code')
      .then(async (response) => {
        const result = (await response.json()) as {
          configured?: boolean;
          code?: string | null;
        };
        if (!response.ok)
          throw new Error('Could not load the current invite code.');
        setInviteCodeConfigured(Boolean(result.configured));
        setStoredInviteCode(result.code ?? null);
      })
      .catch((error: unknown) =>
        setInviteCodeMessage(
          error instanceof Error
            ? error.message
            : 'Could not load the current invite code.',
        ),
      );
    fetch('/api/tba-webhook-verification')
      .then(async (response) => {
        const result = (await response.json()) as {
          verification?: typeof tbaVerification;
          configured?: boolean;
          delivery?: (typeof tbaWebhookStatus)['delivery'];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Could not load webhook status.');
        setTbaVerification(result.verification ?? null);
        setTbaWebhookStatus({
          configured: Boolean(result.configured),
          delivery: result.delivery ?? null,
        });
      })
      .catch((error: unknown) =>
        setTbaVerificationMessage(
          error instanceof Error
            ? error.message
            : 'Could not load webhook status.',
        ),
      );
  }, [activeView, isAdmin, online]);

  useEffect(() => {
    if (activeView !== 'Settings' || !session || !online) return;
    fetch('/api/sessions')
      .then(async (response) => {
        const result = (await response.json()) as {
          sessions?: typeof accountSessions;
          currentSessionId?: string;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Unable to load sessions.');
        setAccountSessions(result.sessions ?? []);
        setCurrentSessionId(result.currentSessionId ?? '');
      })
      .catch((error) =>
        setSessionMessage(
          error instanceof Error ? error.message : 'Unable to load sessions.',
        ),
      );
  }, [activeView, online, session]);

  useEffect(() => {
    if (activeView !== 'Plan' || planningMatches.length === 0) return;
    if (!planningMatches.some((match) => match.key === selectedMatchKey))
      setSelectedMatchKey(planningMatches[0].key);
  }, [activeView, planningMatches, selectedMatchKey]);

  useEffect(() => {
    if (activeView !== 'Plan' || !currentMatch || !session) return;
    setPlanLoading(true);
    setPlanMessage('');
    const cacheId = `match-plan:${currentMatch.id}`;
    const draftId = `match-plan-draft:${currentMatch.id}`;
    Promise.all([
      getDraft<MatchPlan>(draftId),
      getCachedValue<{
        plan: MatchPlan | null;
        canEdit: boolean;
        authorName: string | null;
      }>(cacheId),
    ]).then(([draft, cached]) => {
      if (draft) setMatchPlan(planForMatch(draft.payload, currentMatch));
      else if (cached) setMatchPlan(planForMatch(cached.plan, currentMatch));
      if (cached) {
        setPlanCanEdit(cached.canEdit);
        setPlanAuthor(cached.authorName ?? '');
      }
      if (!online) {
        setPlanMessage(
          'Showing the match plan saved on this device. Changes will remain a local draft until reconnected.',
        );
        setPlanLoading(false);
      }
    });
    if (!online) return;
    fetch(`/api/match-plans?matchId=${encodeURIComponent(currentMatch.id)}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          plan: MatchPlan | null;
          canEdit: boolean;
          authorName: string | null;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Unable to load this match plan.');
        const draft = await getDraft<MatchPlan>(draftId).catch(() => undefined);
        if (!draft) setMatchPlan(planForMatch(result.plan, currentMatch));
        setPlanCanEdit(result.canEdit);
        setPlanAuthor(result.authorName ?? '');
        await saveCachedValue(cacheId, {
          plan: result.plan,
          canEdit: result.canEdit,
          authorName: result.authorName,
        });
      })
      .catch((error) => {
        setMatchPlan(planForMatch(null, currentMatch));
        setPlanCanEdit(false);
        setPlanMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load this match plan.',
        );
      })
      .finally(() => setPlanLoading(false));
  }, [activeView, currentMatch, online, session]);

  useEffect(() => {
    if (activeView !== 'Plan' || !currentMatch || !session) return;
    const matchTeams = new Set([
      ...currentMatch.alliances.red,
      ...currentMatch.alliances.blue,
    ]);
    const statsCacheId = `match-stats:${currentMatch.id}`;
    void getCachedValue<TeamAnalysis[]>(statsCacheId).then((cached) => {
      if (cached) setPlanStats(cached);
    });
    if (!online) return;
    fetch('/api/strategy')
      .then(async (response) => {
        const result = (await response.json()) as {
          teams?: TeamAnalysis[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Unable to load match statistics.');
        const stats = (result.teams ?? []).filter((team) =>
          matchTeams.has(team.teamNumber),
        );
        setPlanStats(stats);
        await saveCachedValue(statsCacheId, stats);
      })
      .catch(() => setPlanStats([]));
  }, [activeView, currentMatch, online, session]);

  useEffect(() => {
    if (activeView !== 'Plan' || !currentMatch || !planCanEdit) return;
    const timer = window.setTimeout(
      () =>
        void saveDraft({
          id: `match-plan-draft:${currentMatch.id}`,
          payload: matchPlan,
          updatedAt: Date.now(),
        }),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [activeView, currentMatch, matchPlan, planCanEdit]);

  useEffect(() => {
    if (!draftReady || !draftId) return;
    const timer = window.setTimeout(() => {
      saveDraft({ id: draftId, payload: currentPayload, updatedAt: Date.now() })
        .then(() => setSaveError(''))
        .catch(() => setSaveError('Could not save this draft offline.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    activeFuel,
    autoFuel,
    autoTower,
    cycleSeconds,
    cycles,
    defenseRating,
    disabled,
    draftId,
    draftReady,
    inactiveFuel,
    noShow,
    notes,
    path,
    penalties,
    shootingRange,
    tower,
  ]);

  useEffect(() => {
    if (!pitDraftId) {
      setPitReady(false);
      return;
    }
    setPitReady(false);
    setPitMessage('');
    setPitPhoto(null);
    getDraft<PitDraft>(pitDraftId)
      .then((draft) => {
        const serverEntry = eventPack?.pitEntries.find(
          (entry) => entry.teamNumber === pitTeam,
        );
        const serverDraft = serverEntry
          ? {
              ...emptyPitDraft,
              ...serverEntry.payload,
              drivetrain: serverEntry.drivetrain ?? 'Swerve',
              swerveModule: serverEntry.swerveModule ?? '',
              motorTypes: serverEntry.motorTypes.join(', '),
              weightLbs: serverEntry.weightLbs ?? 0,
              widthInches: serverEntry.dimensions?.width ?? 0,
              lengthInches: serverEntry.dimensions?.length ?? 0,
              heightInches: serverEntry.dimensions?.height ?? 0,
            }
          : emptyPitDraft;
        setPitDraft(draft?.payload ?? serverDraft);
        setPitReady(true);
      })
      .catch(() => {
        setPitDraft(emptyPitDraft);
        setPitReady(true);
        setPitMessage('Offline storage is unavailable on this device.');
      });
  }, [eventPack, pitDraftId, pitTeam]);

  useEffect(() => {
    if (!pitReady || !pitDraftId) return;
    const timer = window.setTimeout(
      () =>
        void saveDraft({
          id: pitDraftId,
          payload: pitDraft,
          updatedAt: Date.now(),
        }),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [pitDraft, pitDraftId, pitReady]);

  async function submitMatch() {
    if (!draftId || !eventPack || !currentMatch || !selectedTeam) {
      setSaveError('Choose a match and team from the schedule first.');
      return;
    }
    setSaveError('');
    try {
      await queueMutation({
        id: scoutEntryMutationId(
          eventPack.event.key,
          currentMatch.key,
          selectedTeam,
          session?.user.id ?? 'local',
        ),
        organizationId: eventPack.organizationId,
        entity: 'scoutEntry',
        operation: 'upsert',
        createdAt: Date.now(),
        attempts: 0,
        payload: {
          eventKey: eventPack.event.key,
          matchKey: currentMatch.key,
          teamNumber: selectedTeam,
          station: selectedStation,
          seasonYear: eventPack.event.year,
          schemaVersion: 1,
          ...currentPayload,
        },
      });
      setQueuedCount((await getPendingMutations()).length);
      setSaved(true);
      setSubmissionStatus('queued');
    } catch {
      setSaveError('Could not queue this match for synchronization.');
    }
  }

  async function submitPit() {
    if (!eventPack || !pitTeam) {
      setPitMessage('Choose a team first.');
      return;
    }
    const id = `pit:${eventPack.event.key}:${pitTeam}`;
    try {
      await queueMutation({
        id,
        organizationId: eventPack.organizationId,
        entity: 'pitEntry',
        operation: 'upsert',
        createdAt: Date.now(),
        attempts: 0,
        payload: {
          eventKey: eventPack.event.key,
          teamNumber: pitTeam,
          seasonYear: eventPack.event.year,
          schemaVersion: 1,
          ...pitDraft,
          motorTypes: pitDraft.motorTypes
            .split(',')
            .map((motor) => motor.trim())
            .filter(Boolean),
        },
      });
      setQueuedCount((await getPendingMutations()).length);
      setPitMessage(
        online
          ? 'Pit report queued and ready to synchronize.'
          : 'Pit report saved offline. It will synchronize when connected.',
      );
      if (online) await syncNow();
    } catch {
      setPitMessage('Could not save this pit report.');
    }
  }

  async function uploadPitPhoto() {
    if (!pitTeam || !pitPhoto) {
      setPitMessage('Choose a robot photo first.');
      return;
    }
    if (!online) {
      setPitMessage(
        'Photo uploads require a connection. The rest of the pit report is still saved offline.',
      );
      return;
    }
    setPhotoUploading(true);
    setPitMessage('Saving the pit report before uploading…');
    try {
      await submitPit();
      const form = new FormData();
      form.set('teamNumber', String(pitTeam));
      form.set('photo', pitPhoto);
      const response = await fetch('/api/pit-photo', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Photo upload failed.');
      setPitPhoto(null);
      setPhotoVersion(Date.now());
      setPitMessage('Robot photo uploaded.');
      await loadEventPack();
    } catch (error) {
      setPitMessage(
        error instanceof Error ? error.message : 'Photo upload failed.',
      );
    } finally {
      setPhotoUploading(false);
    }
  }

  async function loadEventPack(silent = false, forceRefresh = false) {
    if (!silent) {
      setPackLoading(true);
      setPackError('');
    }
    try {
      const response = await fetch(
        forceRefresh ? '/api/event-pack?refresh=1' : '/api/event-pack',
      );
      const result = (await response.json()) as EventPack & {
        error?: string;
        event: EventPack['event'] | null;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Unable to load the event pack.');
      if (!result.event) {
        const emptyPack = {
          ...result,
          event: {
            id: '',
            year: 2026,
            key: '',
            name: 'No event loaded',
            updatedAt: 0,
          },
          pitEntries: result.pitEntries ?? [],
          organizationId: result.organizationId ?? 'team-401',
        } as EventPack;
        setEventPack(emptyPack);
        setEventKey('');
        return;
      }
      const pack = {
        ...result,
        pitEntries: result.pitEntries ?? [],
        organizationId: result.organizationId ?? 'team-401',
      } as EventPack;
      setEventPack(pack);
      setEventKey(pack.event.key);
      await saveCachedValue('current-event-pack', pack);
      if (!selectedMatchKey && pack.matches.length > 0) {
        const mine = pack.assignments.find(
          (assignment) => assignment.scoutUserId === pack.userId,
        );
        const match =
          pack.matches.find((item) => item.id === mine?.matchId) ??
          pack.matches[0];
        selectAssignment(
          match,
          mine?.teamNumber ?? match.alliances.red[0],
          mine?.station ?? 'red1',
        );
      }
    } catch (error) {
      const cached = await getCachedValue<EventPack>(
        'current-event-pack',
      ).catch(() => undefined);
      if (cached) {
        const pack = {
          ...cached,
          pitEntries: cached.pitEntries ?? [],
          organizationId: cached.organizationId ?? 'team-401',
        };
        setEventPack(pack);
        setEventKey(pack.event.key);
        if (!silent)
          setPackError('Showing the event pack cached on this device.');
      } else if (!silent)
        setPackError(
          error instanceof Error
            ? error.message
            : 'Unable to load the event pack.',
        );
    } finally {
      if (!silent) setPackLoading(false);
    }
  }

  function selectAssignment(match: EventMatch, team: number, station: string) {
    setSelectedMatchKey(match.key);
    setSelectedTeam(team);
    setSelectedStation(station);
    setSaved(false);
    setSubmissionStatus('draft');
    navigate('Scout');
  }

  function continueToNextAssignment() {
    const currentIndex = myAssignments.findIndex(
      ({ assignment, match }) =>
        match?.key === selectedMatchKey &&
        assignment.teamNumber === selectedTeam &&
        assignment.station === selectedStation,
    );
    const next = myAssignments[currentIndex + 1];
    if (next?.match) {
      selectAssignment(
        next.match,
        next.assignment.teamNumber,
        next.assignment.station,
      );
      return;
    }
    navigate('Home');
  }

  async function assignScout(
    match: EventMatch,
    team: number,
    station: string,
    scoutUserId: string,
  ) {
    setAssignmentMessage('');
    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        matchId: match.id,
        teamNumber: team,
        station,
        scoutUserId,
      }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setAssignmentMessage(result.error ?? 'Could not save assignment.');
      return;
    }
    setAssignmentMessage('Assignment saved.');
    await loadEventPack();
  }

  async function reopenEntry(entryId: string) {
    const response = await fetch('/api/entries/reopen', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entryId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setSyncMessage(result.error ?? 'Could not reopen entry.');
      return;
    }
    setSyncMessage('Entry reopened for correction.');
    if (selectedTeam) {
      const refreshed = (await fetch(`/api/analysis?team=${selectedTeam}`).then(
        (item) => item.json(),
      )) as TeamAnalysis;
      setAnalysis(refreshed);
    }
  }

  async function updateMemberRole(userId: string, role: string) {
    setAdminMessage('');
    const response = await fetch('/api/members', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setAdminMessage(result.error ?? 'Could not update role.');
      return;
    }
    setAdminMessage('Role updated.');
    await loadEventPack();
  }

  async function setMemberDisabled(userId: string, disabled: boolean) {
    setAdminMessage('');
    const response = await fetch('/api/members', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, disabled }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setAdminMessage(result.error ?? 'Could not update the account.');
      return;
    }
    setAdminMessage(
      disabled ? 'Account disabled and sessions revoked.' : 'Account enabled.',
    );
    await loadEventPack();
  }

  async function removeMember(userId: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from Team 401? Their historical scouting data will be retained.`,
      )
    )
      return;
    setAdminMessage('');
    const response = await fetch('/api/members', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setAdminMessage(result.error ?? 'Could not remove the member.');
      return;
    }
    setAdminMessage(`${name} was removed from Team 401.`);
    await loadEventPack();
  }

  async function revokeSession(sessionId: string) {
    setSessionMessage('');
    const response = await fetch('/api/sessions', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const result = (await response.json()) as {
      error?: string;
      current?: boolean;
    };
    if (!response.ok) {
      setSessionMessage(result.error ?? 'Could not revoke the session.');
      return;
    }
    if (result.current) {
      window.location.href = '/sign-in';
      return;
    }
    setAccountSessions((items) =>
      items.filter((item) => item.id !== sessionId),
    );
    setSessionMessage('Session revoked.');
  }

  async function updateInviteCode() {
    setInviteCodeMessage('');
    setInviteCodeBusy(true);
    try {
      const response = await fetch('/api/invite-code', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? `Save failed (${response.status}).`);
      setInviteCode('');
      setStoredInviteCode(result.code ?? null);
      setInviteCodeVisible(false);
      setInviteCodeConfigured(true);
      setInviteCodeMessage(
        'Invite code saved. Existing accounts remain signed in.',
      );
    } catch (error) {
      setInviteCodeMessage(
        error instanceof Error
          ? error.message
          : 'Could not update the invite code.',
      );
    } finally {
      setInviteCodeBusy(false);
    }
  }

  async function generateAssignments() {
    setAdminMessage('');
    const response = await fetch('/api/assignments/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scoutUserIds: selectedScoutIds,
        startMatch: assignmentStart,
        endMatch: assignmentEnd,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      matchesAssigned?: number;
      slotsAssigned?: number;
    };
    if (!response.ok) {
      setAdminMessage(result.error ?? 'Could not generate assignments.');
      return;
    }
    setAdminMessage(
      `Assigned ${result.slotsAssigned ?? 0} stations across ${result.matchesAssigned ?? 0} matches.`,
    );
    await loadEventPack();
  }

  async function syncNow() {
    if (!session) {
      setSyncMessage('Sign in before synchronizing.');
      return;
    }
    if (!online) {
      setSyncMessage('This device is offline. Your entries are still safe.');
      return;
    }
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await synchronizePendingMutations();
      setQueuedCount(result.pending);
      if (mutationId && result.acceptedIds.includes(mutationId))
        setSubmissionStatus('synchronized');
      if (mutationId && result.rejected.some((item) => item.id === mutationId))
        setSubmissionStatus('rejected');
      setSyncMessage(
        result.errors[0] ??
          (result.accepted > 0
            ? `${result.accepted} match ${result.accepted === 1 ? 'entry' : 'entries'} synchronized.`
            : 'Everything is synchronized.'),
      );
    } catch (error) {
      setSyncMessage(
        error instanceof Error
          ? error.message
          : 'Synchronization failed. Your entries are still queued.',
      );
    } finally {
      setSyncing(false);
    }
  }

  async function saveMatchPlan() {
    if (!currentMatch) {
      setPlanMessage('Choose a match first.');
      return;
    }
    setPlanLoading(true);
    setPlanMessage('');
    try {
      const response = await fetch('/api/match-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ matchId: currentMatch.id, ...matchPlan }),
      });
      const result = (await response.json()) as {
        error?: string;
        authorName?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Unable to save this match plan.');
      setPlanAuthor(result.authorName ?? session?.user.name ?? '');
      await saveCachedValue(`match-plan:${currentMatch.id}`, {
        plan: matchPlan,
        canEdit: true,
        authorName: result.authorName ?? session?.user.name ?? null,
      });
      await saveDraft({
        id: `match-plan-draft:${currentMatch.id}`,
        payload: matchPlan,
        updatedAt: Date.now(),
      });
      setPlanMessage('Match plan saved for the drive team.');
    } catch (error) {
      setPlanMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save this match plan.',
      );
    } finally {
      setPlanLoading(false);
    }
  }

  async function configureEvent() {
    setConfiguringEvent(true);
    setEventMessage('');
    try {
      const response = await fetch('/api/event-pack', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventKey: eventKey.trim().toLowerCase() }),
      });
      const result = (await response.json()) as {
        error?: string;
        event?: { name: string };
        matchCount?: number;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Unable to load this event.');
      setEventMessage(
        `${result.event?.name ?? eventKey} is current. Cached ${result.matchCount ?? 0} matches.`,
      );
      await loadEventPack();
    } catch (error) {
      setEventMessage(
        error instanceof Error ? error.message : 'Unable to load this event.',
      );
    } finally {
      setConfiguringEvent(false);
    }
  }

  function renderStation(
    match: EventMatch,
    color: 'red' | 'blue',
    team: number,
    index: number,
  ) {
    const station = `${color}${index + 1}`;
    const assignment = eventPack?.assignments.find(
      (item) => item.matchId === match.id && item.station === station,
    );
    const scout = eventPack?.members.find(
      (member) => member.id === assignment?.scoutUserId,
    );
    const canManage = eventPack && canManageAssignments(eventPack.role);
    return (
      <div className="grid gap-1" key={`${station}-${team}`}>
        <button
          className={`choice ${color === 'red' ? 'border-red-300' : 'border-blue-300'}`}
          onClick={() => selectAssignment(match, team, station)}
        >
          {color === 'red' ? 'R' : 'B'}
          {index + 1} · {team}
        </button>
        {canManage ? (
          <select
            aria-label={`Scout assigned to ${station} team ${team}`}
            className="h-8 rounded-md border bg-transparent px-1 text-xs"
            value={assignment?.scoutUserId ?? ''}
            onChange={(event) =>
              event.target.value &&
              void assignScout(match, team, station, event.target.value)
            }
          >
            <option value="">Unassigned</option>
            {eventPack.members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        ) : (
          <small className="text-center text-muted-foreground">
            {scout?.name ?? 'Unassigned'}
          </small>
        )}
      </div>
    );
  }

  const myAssignments =
    eventPack?.assignments
      .map((assignment) => ({
        assignment,
        match: eventPack.matches.find(
          (match) => match.id === assignment.matchId,
        ),
      }))
      .filter(
        (item) =>
          item.assignment.scoutUserId === eventPack.userId &&
          item.match &&
          !item.match.result?.actualTime,
      )
      .sort(
        (a, b) =>
          (a.match?.predictedAt ?? a.match?.scheduledAt ?? Infinity) -
          (b.match?.predictedAt ?? b.match?.scheduledAt ?? Infinity),
      ) ?? [];
  const nextAssignment = myAssignments[0];
  const visibleMatches =
    eventPack?.matches.filter((match) => {
      const assignments = eventPack.assignments.filter(
        (item) => item.matchId === match.id,
      );
      if (
        scheduleFilter === 'mine' &&
        !assignments.some((item) => item.scoutUserId === eventPack.userId)
      )
        return false;
      if (scheduleFilter === 'unassigned' && assignments.length >= 6)
        return false;
      const query = scheduleSearch.trim().toLowerCase();
      return (
        !query ||
        matchLabel(match).toLowerCase().includes(query) ||
        [...match.alliances.red, ...match.alliances.blue].some((team) =>
          String(team).includes(query),
        )
      );
    }) ?? [];
  const planTeams = currentMatch
    ? [...currentMatch.alliances.red, ...currentMatch.alliances.blue].map(
        (team) => ({
          team,
          alliance: currentMatch.alliances.red.includes(team)
            ? ('red' as const)
            : ('blue' as const),
          stats: planStats.find((item) => item.teamNumber === team),
        }),
      )
    : [];
  const ourPlanAlliance = currentMatch?.alliances.red.includes(
    organizationTeamNumber,
  )
    ? 'red'
    : currentMatch?.alliances.blue.includes(organizationTeamNumber)
      ? 'blue'
      : null;
  const bestPartner = planTeams
    .filter(
      (item) =>
        item.alliance === ourPlanAlliance &&
        item.team !== organizationTeamNumber,
    )
    .sort(
      (a, b) => (b.stats?.medianPoints ?? 0) - (a.stats?.medianPoints ?? 0),
    )[0]?.team;
  const defenseTarget = planTeams
    .filter((item) => item.alliance !== ourPlanAlliance)
    .sort(
      (a, b) => (b.stats?.medianPoints ?? 0) - (a.stats?.medianPoints ?? 0),
    )[0]?.team;
  const totalSlots = (eventPack?.matches.length ?? 0) * 6;
  const assignmentCounts =
    eventPack?.members.map((member) => ({
      member,
      count: eventPack.assignments.filter(
        (assignment) => assignment.scoutUserId === member.id,
      ).length,
    })) ?? [];

  return (
    <main className={dark ? 'dark app-shell' : 'app-shell'}>
      <aside className="desktop-nav">
        <div className="brand-mark">401</div>
        <nav aria-label="Primary navigation" className="mt-8 grid gap-2">
          {visibleNav.map(({ label, icon: Icon }) => (
            <button
              type="button"
              aria-current={activeView === label ? 'page' : undefined}
              onClick={() => navigate(label)}
              className={activeView === label ? 'nav-item active' : 'nav-item'}
              key={label}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              aria-current={activeView === 'Admin' ? 'page' : undefined}
              onClick={() => navigate('Admin')}
              className={
                activeView === 'Admin' ? 'nav-item active' : 'nav-item'
              }
            >
              <UserCog />
              <span>Admin</span>
            </button>
          )}
        </nav>
        <button
          type="button"
          aria-current={activeView === 'Settings' ? 'page' : undefined}
          onClick={() => navigate('Settings')}
          className={
            activeView === 'Settings'
              ? 'nav-item active mt-auto'
              : 'nav-item mt-auto'
          }
        >
          <Settings />
          <span>Settings</span>
        </button>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="topbar">
          <div className="flex items-center gap-2">
            {viewHistory.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Go to previous scouting page"
                onClick={goBack}
              >
                <ArrowLeft />
              </Button>
            )}
            <div>
              <p className="eyebrow">{eventPack?.event.name ?? 'Team 401'}</p>
              <h1>
                {activeView === 'Scout'
                  ? currentMatch
                    ? matchLabel(currentMatch)
                    : 'Choose an assignment'
                  : activeView}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="status-badge">
              {online ? <Cloud /> : <CloudOff />}
              {online ? 'Online' : 'Offline ready'}
            </Badge>
            {!isPending &&
              (session ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    authClient.signOut().then(() => window.location.reload())
                  }
                >
                  <LogOut />
                  {session.user.name}
                </Button>
              ) : (
                <Button nativeButton={false} render={<a href="/sign-in" />}>
                  Sign in
                </Button>
              ))}
            <Button
              aria-label="Toggle color theme"
              size="icon"
              variant="ghost"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        {activeView === 'Home' && (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Welcome, {session?.user.name ?? 'scout'}</CardTitle>
                <Badge variant="outline">
                  {eventPack?.role ?? 'signed out'}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {eventPack?.event.name ??
                    'An admin needs to load the current event.'}
                </p>
                {eventPack?.event.updatedAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Live data updated{' '}
                    {new Date(eventPack.event.updatedAt).toLocaleTimeString(
                      [],
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                      },
                    )}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setAdminSection('assignments');
                        navigate('Admin');
                      }}
                    >
                      <CalendarDays />
                      Scout assignments
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    disabled={!online || packLoading}
                    onClick={() => void loadEventPack(false, true)}
                  >
                    <RefreshCw className={packLoading ? 'animate-spin' : ''} />
                    Refresh live data
                  </Button>
                  {canUseStrategy && (
                    <Button variant="outline" onClick={() => navigate('Plan')}>
                      <BarChart3 />
                      Strategy workspace
                    </Button>
                  )}
                  {isAdmin && (
                    <Button variant="outline" onClick={() => navigate('Admin')}>
                      <UserCog />
                      Administration
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Next assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextAssignment?.match ? (
                  <>
                    <div>
                      <p className="text-2xl font-bold">
                        {matchLabel(nextAssignment.match)}
                      </p>
                      <p className="text-muted-foreground">
                        Team {nextAssignment.assignment.teamNumber} ·{' '}
                        {nextAssignment.assignment.station.toUpperCase()}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {nextAssignment.match.predictedAt
                          ? new Date(
                              nextAssignment.match.predictedAt,
                            ).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'Time TBD'}{' '}
                        · {nextAssignment.match.alliances.red.join(', ')} vs{' '}
                        {nextAssignment.match.alliances.blue.join(', ')}
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() =>
                        selectAssignment(
                          nextAssignment.match!,
                          nextAssignment.assignment.teamNumber,
                          nextAssignment.assignment.station,
                        )
                      }
                    >
                      Start scouting
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No assignment has been scheduled for you yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>My assignments</CardTitle>
                <Badge variant="outline">{myAssignments.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                {myAssignments.slice(0, 5).map(
                  ({ assignment, match }) =>
                    match && (
                      <button
                        className="schedule-row w-full text-left"
                        onClick={() =>
                          selectAssignment(
                            match,
                            assignment.teamNumber,
                            assignment.station,
                          )
                        }
                        key={`${match.id}-${assignment.station}`}
                      >
                        <strong>{matchLabel(match)}</strong>
                        <span>Team {assignment.teamNumber}</span>
                        <small>{assignment.station.toUpperCase()}</small>
                      </button>
                    ),
                )}
                {myAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No assignments yet.
                  </p>
                )}
              </CardContent>
            </Card>
            <OfflineReadiness
              eventKey={eventPack?.event.key ?? ''}
              eventName={eventPack?.event.name ?? ''}
              matchCount={eventPack?.matches.length ?? 0}
              teamCount={eventTeams.length}
              online={online}
              onRefresh={() => loadEventPack(false, true)}
            />
            <QrRelay
              organizationId={eventPack?.organizationId ?? ''}
              eventKey={eventPack?.event.key ?? ''}
              online={online}
            />
            <Card>
              <CardHeader>
                <CardTitle>Event coverage</CardTitle>
              </CardHeader>
              <CardContent className="mini-stats">
                <span>
                  <strong>{eventPack?.assignments.length ?? 0}</strong> assigned
                  slots
                </span>
                <span>
                  <strong>{totalSlots}</strong> total slots
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick links</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" onClick={() => navigate('Teams')}>
                  Browse {eventTeams.length} teams
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void syncNow()}
                  disabled={!queuedCount || syncing}
                >
                  Sync this device
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Scout' && (
          <div className="mx-auto w-full max-w-3xl p-4 pb-28 sm:p-6">
            <div className="min-w-0 space-y-4">
              <Card className="match-card">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="station-dot" />
                    <div>
                      <p className="eyebrow">
                        {selectedStation
                          ? `${selectedStation.replace(/(red|blue)/, '$1 ')} · Selected assignment`
                          : 'No assignment selected'}
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedTeam
                          ? `Team ${selectedTeam}`
                          : 'Open the schedule'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {eventPack?.event.year ?? 2026} REBUILT
                    </p>
                    <p className="font-mono text-lg font-bold text-primary">
                      {currentMatch?.predictedAt
                        ? new Date(currentMatch.predictedAt).toLocaleTimeString(
                            [],
                            { hour: 'numeric', minute: '2-digit' },
                          )
                        : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Autonomous · 20 seconds</CardTitle>
                  <Badge variant="secondary">
                    <Zap /> HUB active
                  </Badge>
                </CardHeader>
                <CardContent className="divide-y divide-border p-0">
                  <Counter
                    label="FUEL scored"
                    hint="Use +5 for a burst, then adjust or type the total"
                    value={autoFuel}
                    onChange={setAutoFuel}
                    quickAdds={[5]}
                  />
                  <div className="choice-section">
                    <span>
                      <strong>Auto TOWER</strong>
                      <small>LEVEL 1 only</small>
                    </span>
                    <div className="two-choices">
                      {['None', 'Level 1'].map((item) => (
                        <button
                          type="button"
                          onClick={() => setAutoTower(item)}
                          key={item}
                          className={
                            autoTower === item ? 'choice selected' : 'choice'
                          }
                        >
                          {autoTower === item && <Check />}
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Teleoperated FUEL</CardTitle>
                  <Badge variant="outline">Shift-aware</Badge>
                </CardHeader>
                <CardContent className="divide-y divide-border p-0">
                  <Counter
                    label="Active HUB FUEL"
                    hint="Add observed bursts with +5 or +10; fine-tune anytime"
                    value={activeFuel}
                    onChange={setActiveFuel}
                    quickAdds={[5, 10]}
                  />
                  <Counter
                    label="Inactive HUB attempts"
                    hint="Useful efficiency and awareness signal"
                    value={inactiveFuel}
                    onChange={setInactiveFuel}
                    quickAdds={[5]}
                  />
                  <Counter
                    label="Scoring cycles"
                    hint="Intake → shoot cycles completed"
                    value={cycles}
                    onChange={setCycles}
                  />
                </CardContent>
              </Card>
              <div className="form-pair">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Gauge /> Field movement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-2">
                    {['Trench', 'Bump', 'Both'].map((item) => (
                      <button
                        key={item}
                        onClick={() => setPath(item)}
                        className={path === item ? 'choice selected' : 'choice'}
                      >
                        {path === item && <Check />}
                        {item}
                      </button>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Shield /> Defense
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rating-row">
                    {[0, 1, 2, 3].map((rating) => (
                      <button
                        onClick={() => setDefenseRating(rating)}
                        className={defenseRating === rating ? 'selected' : ''}
                        key={rating}
                      >
                        {rating}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Scoring profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div>
                    <p className="mb-2 font-semibold">Typical shooting range</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {['Near', 'Midfield', 'Far', 'Mixed'].map((item) => (
                        <button
                          className={
                            shootingRange === item
                              ? 'choice selected'
                              : 'choice'
                          }
                          onClick={() => setShootingRange(item)}
                          key={item}
                        >
                          {shootingRange === item && <Check />}
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Counter
                    label="Average cycle time"
                    hint="Approximate seconds from intake to shot"
                    value={cycleSeconds}
                    onChange={setCycleSeconds}
                  />
                  <Counter
                    label="Penalty points caused"
                    hint="Observed penalties attributable to this robot"
                    value={penalties}
                    onChange={setPenalties}
                    quickAdds={[5]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>
                    <TowerControl /> Endgame TOWER
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {['None', 'Level 1', 'Level 2', 'Level 3'].map((item) => (
                    <button
                      onClick={() => setTower(item)}
                      key={item}
                      className={tower === item ? 'choice selected' : 'choice'}
                    >
                      {tower === item && <Check />}
                      {item}
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Reliability and notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={disabled ? 'choice selected' : 'choice'}
                      onClick={() => setDisabled(!disabled)}
                    >
                      {disabled && <Check />}Disabled or broken
                    </button>
                    <button
                      className={noShow ? 'choice selected' : 'choice'}
                      onClick={() => setNoShow(!noShow)}
                    >
                      {noShow && <Check />}No-show
                    </button>
                  </div>
                  <textarea
                    className="min-h-24 w-full rounded-lg border bg-transparent p-3 text-base"
                    value={notes}
                    maxLength={1000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Strategy-relevant observations, failure details, defense quality…"
                  />
                </CardContent>
              </Card>
              {saveError && (
                <p role="alert" className="auth-error">
                  {saveError}
                </p>
              )}
              <Button
                className="h-12 w-full text-base"
                disabled={!draftReady || submissionStatus === 'synchronized'}
                onClick={submitMatch}
              >
                {submissionStatus === 'synchronized' ? (
                  <>
                    <Check /> Synchronized · locked
                  </>
                ) : submissionStatus === 'rejected' ? (
                  <>Rejected · review sync error</>
                ) : submissionStatus === 'queued' ? (
                  <>
                    <Check /> Queued for sync · {estimatedPoints} pts observed
                  </>
                ) : draftReady ? (
                  <>
                    Save match offline <ChevronRight />
                  </>
                ) : (
                  <>Opening offline storage…</>
                )}
              </Button>
              {(submissionStatus === 'queued' ||
                submissionStatus === 'synchronized') && (
                <Button
                  className="h-12 w-full text-base"
                  variant="outline"
                  onClick={continueToNextAssignment}
                >
                  {myAssignments.some(
                    ({ match }) => match && match.key !== selectedMatchKey,
                  )
                    ? 'Continue to next assignment'
                    : 'Return home'}
                  <ChevronRight />
                </Button>
              )}
            </div>
          </div>
        )}
        {activeView === 'Pit' && (
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[18rem_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Pit queue</CardTitle>
                <Badge variant="outline">
                  {eventPack?.pitEntries.length ?? 0}/{eventTeams.length}{' '}
                  complete
                </Badge>
              </CardHeader>
              <CardContent className="max-h-[65vh] space-y-1 overflow-auto">
                {eventTeams.map((team) => {
                  const complete = eventPack?.pitEntries.some(
                    (entry) => entry.teamNumber === team,
                  );
                  return (
                    <button
                      type="button"
                      className={
                        pitTeam === team
                          ? 'schedule-row selected w-full text-left'
                          : 'schedule-row w-full text-left'
                      }
                      onClick={() => setPitTeam(team)}
                      key={team}
                    >
                      <strong>Team {team}</strong>
                      <span>{complete ? 'Report saved' : 'Not scouted'}</span>
                      {complete ? <Check /> : <ChevronRight />}
                    </button>
                  );
                })}
                {eventTeams.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Load an event pack before pit scouting.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  {pitTeam ? `Team ${pitTeam} robot` : 'Choose a team'}
                </CardTitle>
                {pitTeam && <Badge variant="outline">Auto-saved offline</Badge>}
              </CardHeader>
              <CardContent className="space-y-4">
                {pitTeam && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        Drivetrain
                        <select
                          className="h-10 rounded-md border bg-transparent px-3"
                          value={pitDraft.drivetrain}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              drivetrain: event.target.value,
                            })
                          }
                        >
                          <option>Swerve</option>
                          <option>Tank</option>
                          <option>Mecanum</option>
                          <option>Other</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm">
                        Swerve module
                        <Input
                          disabled={pitDraft.drivetrain !== 'Swerve'}
                          value={pitDraft.swerveModule}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              swerveModule: event.target.value,
                            })
                          }
                          placeholder="MK4i, MAXSwerve…"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Motor types
                        <Input
                          value={pitDraft.motorTypes}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              motorTypes: event.target.value,
                            })
                          }
                          placeholder="Kraken X60, NEO…"
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Weight (lb)
                        <Input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={pitDraft.weightLbs || ''}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              weightLbs: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Width (in)
                        <Input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={pitDraft.widthInches || ''}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              widthInches: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Length (in)
                        <Input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={pitDraft.lengthInches || ''}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              lengthInches: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Height (in)
                        <Input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={pitDraft.heightInches || ''}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              heightInches: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        FUEL capacity
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={pitDraft.fuelCapacity || ''}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              fuelCapacity: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Tower capability
                        <select
                          className="h-10 rounded-md border bg-transparent px-3"
                          value={pitDraft.climbCapability}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              climbCapability: event.target.value,
                            })
                          }
                        >
                          <option>None</option>
                          <option>Level 1</option>
                          <option>Level 2</option>
                          <option>Level 3</option>
                          <option>Multiple levels</option>
                        </select>
                      </label>
                    </div>
                    <label className="grid gap-1 text-sm">
                      Autonomous capabilities
                      <textarea
                        className="min-h-20 rounded-md border bg-transparent p-3"
                        value={pitDraft.autonomousCapabilities}
                        onChange={(event) =>
                          setPitDraft({
                            ...pitDraft,
                            autonomousCapabilities: event.target.value,
                          })
                        }
                        placeholder="Starting locations, paths, scoring routines…"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      Notes
                      <textarea
                        className="min-h-24 rounded-md border bg-transparent p-3"
                        value={pitDraft.notes}
                        onChange={(event) =>
                          setPitDraft({
                            ...pitDraft,
                            notes: event.target.value,
                          })
                        }
                        placeholder="Mechanisms, reliability concerns, programming notes…"
                      />
                    </label>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={!pitReady}
                      onClick={() => void submitPit()}
                    >
                      <Cloud />
                      Save pit report
                    </Button>
                    {pitMessage && (
                      <p
                        className="text-sm text-muted-foreground"
                        role="status"
                      >
                        {pitMessage}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Pit' && pitTeam && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Camera />
                  Team {pitTeam} robot photo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                {existingPitPhoto && (
                  <img
                    className="aspect-square w-full rounded-md object-cover"
                    src={`/api/pit-photo?team=${pitTeam}&v=${photoVersion}`}
                    alt={`Team ${pitTeam} robot`}
                  />
                )}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    JPEG, PNG, or WebP up to 10 MB. The pit report is
                    synchronized before the image is stored privately in R2.
                  </p>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) =>
                      setPitPhoto(event.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!pitPhoto || photoUploading || !online}
                    onClick={() => void uploadPitPhoto()}
                  >
                    <Upload />
                    {photoUploading
                      ? 'Uploading…'
                      : existingPitPhoto
                        ? 'Replace photo'
                        : 'Upload photo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Plan' && (
          <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[18rem_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  aria-label="Match to plan"
                  className="h-11 w-full rounded-md border bg-transparent px-3"
                  value={selectedMatchKey}
                  onChange={(event) => setSelectedMatchKey(event.target.value)}
                >
                  {planningMatches.map((match) => (
                    <option value={match.key} key={match.key}>
                      {matchLabel(match)} · {match.alliances.red.join(', ')} vs{' '}
                      {match.alliances.blue.join(', ')}
                    </option>
                  ))}
                </select>
                {eventPack && planningMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Team {organizationTeamNumber} is not scheduled for any
                    matches in this event pack.
                  </p>
                )}
                {currentMatch && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-red-300 p-3">
                      <p className="text-xs font-semibold text-red-600">RED</p>
                      {currentMatch.alliances.red.map((team, index) => (
                        <p key={team}>
                          <strong>R{index + 1}</strong> · Team {team}
                        </p>
                      ))}
                    </div>
                    <div className="rounded-lg border border-blue-300 p-3">
                      <p className="text-xs font-semibold text-blue-600">
                        BLUE
                      </p>
                      {currentMatch.alliances.blue.map((team, index) => (
                        <p key={team}>
                          <strong>B{index + 1}</strong> · Team {team}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {planAuthor && (
                  <p className="text-xs text-muted-foreground">
                    Last saved by {planAuthor}
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Field strategy</CardTitle>
                  <Badge variant="outline">
                    {planCanEdit ? 'Drag robots and draw' : 'Read only'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <TacticalBoard
                    value={matchPlan.board}
                    readOnly={!planCanEdit}
                    onChange={(board) => setMatchPlan({ ...matchPlan, board })}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Match intelligence</CardTitle>
                  <div className="flex gap-2">
                    {bestPartner && <Badge>Best partner · {bestPartner}</Badge>}
                    {defenseTarget && (
                      <Badge variant="outline">
                        Defense target · {defenseTarget}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {planTeams.map(({ team, alliance, stats }) => (
                    <div
                      className={
                        alliance === 'red'
                          ? 'rounded-lg border border-red-300 p-3'
                          : 'rounded-lg border border-blue-300 p-3'
                      }
                      key={team}
                    >
                      <div className="flex items-center justify-between">
                        <strong>Team {team}</strong>
                        <span className="text-xs font-semibold uppercase">
                          {alliance}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <span>
                          <strong>{stats?.epa?.toFixed(1) ?? '—'}</strong>
                          <small className="block text-muted-foreground">
                            EPA
                          </small>
                        </span>
                        <span>
                          <strong>{stats?.opr?.toFixed(1) ?? '—'}</strong>
                          <small className="block text-muted-foreground">
                            OPR
                          </small>
                        </span>
                        <span>
                          <strong>
                            {stats?.medianPoints.toFixed(1) ?? '—'}
                          </strong>
                          <small className="block text-muted-foreground">
                            median pts
                          </small>
                        </span>
                        <span>
                          <strong>
                            {stats?.medianFuelPerCycle.toFixed(1) ?? '—'}
                          </strong>
                          <small className="block text-muted-foreground">
                            fuel/cycle
                          </small>
                        </span>
                        <span>
                          <strong>
                            {Math.round((stats?.towerSuccessRate ?? 0) * 100)}%
                          </strong>
                          <small className="block text-muted-foreground">
                            tower
                          </small>
                        </span>
                        <span>
                          <strong>
                            {Math.round((stats?.disabledRate ?? 0) * 100)}%
                          </strong>
                          <small className="block text-muted-foreground">
                            disabled
                          </small>
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {stats?.samples ?? 0} scouting samples ·{' '}
                        {Math.round((stats?.coverage ?? 0) * 100)}% coverage
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Plan notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <textarea
                    aria-label="Match plan notes"
                    className="min-h-20 w-full rounded-md border bg-transparent p-3"
                    disabled={!planCanEdit}
                    value={matchPlan.notes}
                    onChange={(event) =>
                      setMatchPlan({ ...matchPlan, notes: event.target.value })
                    }
                    placeholder="Only details that are not clear from the field drawing"
                  />
                  {planCanEdit && (
                    <Button
                      disabled={planLoading || !currentMatch || !online}
                      onClick={() => void saveMatchPlan()}
                    >
                      <Check />
                      {planLoading ? 'Saving…' : 'Save official plan'}
                    </Button>
                  )}
                  {planMessage && (
                    <p className="text-sm text-muted-foreground" role="status">
                      {planMessage}
                    </p>
                  )}
                </CardContent>
              </Card>
              <MatchVideoLibrary
                matchId={currentMatch?.id ?? null}
                matchLabel={
                  currentMatch ? matchLabel(currentMatch) : 'this match'
                }
              />
              {false && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Alliance objective</CardTitle>
                      <Badge variant="outline">
                        {planCanEdit ? 'Editable' : 'Read only'}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        aria-label="Alliance objective"
                        className="min-h-20 w-full rounded-md border bg-transparent p-3"
                        disabled={!planCanEdit}
                        value={matchPlan.objective}
                        onChange={(event) =>
                          setMatchPlan({
                            ...matchPlan,
                            objective: event.target.value,
                          })
                        }
                        placeholder="What must this alliance accomplish to win?"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Team responsibilities</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {currentMatch &&
                        [
                          ...(currentMatch?.alliances.red ?? []).map(
                            (team, index) => ({
                              team,
                              station: `R${index + 1}`,
                            }),
                          ),
                          ...(currentMatch?.alliances.blue ?? []).map(
                            (team, index) => ({
                              team,
                              station: `B${index + 1}`,
                            }),
                          ),
                        ].map(({ team, station }) => (
                          <label className="grid gap-1 text-sm" key={team}>
                            <span>
                              <strong>{station}</strong> · Team {team}
                            </span>
                            <textarea
                              className="min-h-20 rounded-md border bg-transparent p-2"
                              disabled={!planCanEdit}
                              value={matchPlan.teamRoles[String(team)] ?? ''}
                              onChange={(event) =>
                                setMatchPlan({
                                  ...matchPlan,
                                  teamRoles: {
                                    ...matchPlan.teamRoles,
                                    [team]: event.target.value,
                                  },
                                })
                              }
                              placeholder="Starting position and role"
                            />
                          </label>
                        ))}
                    </CardContent>
                  </Card>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Autonomous</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          aria-label="Autonomous plan"
                          className="min-h-28 w-full rounded-md border bg-transparent p-3"
                          disabled={!planCanEdit}
                          value={matchPlan.autonomous}
                          onChange={(event) =>
                            setMatchPlan({
                              ...matchPlan,
                              autonomous: event.target.value,
                            })
                          }
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Offense</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          aria-label="Offense plan"
                          className="min-h-28 w-full rounded-md border bg-transparent p-3"
                          disabled={!planCanEdit}
                          value={matchPlan.offense}
                          onChange={(event) =>
                            setMatchPlan({
                              ...matchPlan,
                              offense: event.target.value,
                            })
                          }
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Defense</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          aria-label="Defense plan"
                          className="min-h-28 w-full rounded-md border bg-transparent p-3"
                          disabled={!planCanEdit}
                          value={matchPlan.defense}
                          onChange={(event) =>
                            setMatchPlan({
                              ...matchPlan,
                              defense: event.target.value,
                            })
                          }
                        />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Endgame</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <textarea
                          aria-label="Endgame plan"
                          className="min-h-28 w-full rounded-md border bg-transparent p-3"
                          disabled={!planCanEdit}
                          value={matchPlan.endgame}
                          onChange={(event) =>
                            setMatchPlan({
                              ...matchPlan,
                              endgame: event.target.value,
                            })
                          }
                        />
                      </CardContent>
                    </Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Drive team notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <textarea
                        aria-label="Drive team notes"
                        className="min-h-28 w-full rounded-md border bg-transparent p-3"
                        disabled={!planCanEdit}
                        value={matchPlan.notes}
                        onChange={(event) =>
                          setMatchPlan({
                            ...matchPlan,
                            notes: event.target.value,
                          })
                        }
                      />
                      {planCanEdit && (
                        <Button
                          disabled={planLoading || !currentMatch || !online}
                          onClick={() => void saveMatchPlan()}
                        >
                          <Check />
                          {planLoading ? 'Saving…' : 'Save match plan'}
                        </Button>
                      )}
                      {planMessage && (
                        <p
                          className="text-sm text-muted-foreground"
                          role="status"
                        >
                          {planMessage}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
        {activeView === 'Admin' && isAdmin && (
          <div className="flex gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <Button
              variant={adminSection === 'settings' ? 'default' : 'outline'}
              onClick={() => setAdminSection('settings')}
            >
              Team and event
            </Button>
            <Button
              variant={adminSection === 'assignments' ? 'default' : 'outline'}
              onClick={() => setAdminSection('assignments')}
            >
              <CalendarDays /> Scout assignments
            </Button>
          </div>
        )}
        {activeView === 'Admin' &&
          isAdmin &&
          adminSection === 'assignments' && (
            <div className="p-4 sm:p-6">
              <ScoutingOperations mode="coverage" />
              <Card>
                <CardHeader>
                  <CardTitle>
                    {eventPack?.event.name ?? 'Match schedule'}
                  </CardTitle>
                  <Badge variant="outline">
                    {visibleMatches.length} of {eventPack?.matches.length ?? 0}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {eventPack?.event.updatedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Schedule and results updated{' '}
                      {new Date(eventPack.event.updatedAt).toLocaleTimeString()}
                      . Online devices check every 45 seconds.
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={scheduleSearch}
                      onChange={(event) =>
                        setScheduleSearch(event.target.value)
                      }
                      placeholder="Search match or team number"
                    />
                    <div className="flex gap-1">
                      {(['all', 'mine', 'unassigned'] as const).map(
                        (filter) => (
                          <Button
                            size="sm"
                            variant={
                              scheduleFilter === filter ? 'default' : 'outline'
                            }
                            onClick={() => setScheduleFilter(filter)}
                            key={filter}
                          >
                            {filter === 'all'
                              ? 'All'
                              : filter === 'mine'
                                ? 'Mine'
                                : 'Needs scout'}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                  {packLoading && (
                    <p className="text-sm text-muted-foreground">
                      Loading event pack…
                    </p>
                  )}
                  {packError && <p className="auth-error">{packError}</p>}
                  {assignmentMessage && (
                    <p className="text-sm text-muted-foreground" role="status">
                      {assignmentMessage}
                    </p>
                  )}
                  {visibleMatches.map((match) => (
                    <div className="rounded-lg border p-3" key={match.key}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong>{matchLabel(match)}</strong>
                          {match.result?.actualTime ? (
                            <Badge variant="secondary">
                              Final · {match.result.redScore ?? '—'}–
                              {match.result.blueScore ?? '—'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Upcoming</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <small className="text-muted-foreground">
                            {match.predictedAt
                              ? new Date(match.predictedAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  },
                                )
                              : 'Time TBD'}
                          </small>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMatchKey(match.key);
                              navigate('Plan');
                            }}
                          >
                            <Map />
                            Plan
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="grid grid-cols-3 gap-2">
                          {match.alliances.red.map((team, index) =>
                            renderStation(match, 'red', team, index),
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {match.alliances.blue.map((team, index) =>
                            renderStation(match, 'blue', team, index),
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!packLoading && !eventPack && (
                    <p className="text-sm text-muted-foreground">
                      No event pack is loaded. An owner or admin can load one in
                      Admin.
                    </p>
                  )}
                  {eventPack && visibleMatches.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No matches match this filter.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        {activeView === 'Teams' && (
          <div className="p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Teams at {eventPack?.event.name ?? 'this event'}
                </CardTitle>
                <Badge variant="outline">{eventTeams.length} teams</Badge>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {eventTeams.map((team) => (
                  <button
                    onClick={() => {
                      setSelectedTeam(team);
                      if (canUseStrategy) navigate('Plan');
                      else {
                        setPitTeam(team);
                        navigate('Pit');
                      }
                    }}
                    className="schedule-row w-full text-left"
                    key={team}
                  >
                    <strong>Team {team}</strong>
                    <span>
                      {
                        eventPack?.matches.filter((match) =>
                          [
                            ...match.alliances.red,
                            ...match.alliances.blue,
                          ].includes(team),
                        ).length
                      }{' '}
                      matches
                    </span>
                    <ChevronRight />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Plan' && canUseStrategy && (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
            <ScoutingOperations mode="review" />
            {eventPack && (
              <PickListWorkspace
                teams={strategyTeams}
                eventKey={eventPack.event.key}
                organizationTeamNumber={organizationTeamNumber}
              />
            )}
            <TeamComparison
              teams={strategyTeams}
              matchTeams={
                currentMatch
                  ? [
                      ...currentMatch.alliances.red,
                      ...currentMatch.alliances.blue,
                    ]
                  : []
              }
            />
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Event ranking workspace</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{strategyTeams.length} teams</Badge>
                  {eventPack && canReopenEntries(eventPack.role) && (
                    <Button
                      nativeButton={false}
                      size="sm"
                      variant="outline"
                      render={<a href="/api/export/scouting" download />}
                    >
                      <Cloud />
                      Export CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="max-h-96 overflow-auto">
                <div className="strategy-table">
                  <strong>Team</strong>
                  <strong>Samples</strong>
                  <strong>Median pts</strong>
                  <strong>Fuel/cycle</strong>
                  <strong>Coverage</strong>
                  {[...strategyTeams]
                    .sort((a, b) => b.medianPoints - a.medianPoints)
                    .map((team) => (
                      <button
                        key={team.teamNumber}
                        onClick={() => setSelectedTeam(team.teamNumber)}
                        className={
                          selectedTeam === team.teamNumber ? 'selected' : ''
                        }
                      >
                        <span>{team.teamNumber}</span>
                        <span>{team.samples}</span>
                        <span>{team.medianPoints.toFixed(1)}</span>
                        <span>{team.medianFuelPerCycle.toFixed(1)}</span>
                        <span>{Math.round(team.coverage * 100)}%</span>
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTeam
                    ? `Team ${selectedTeam} snapshot`
                    : 'Select a team above'}
                </CardTitle>
                <Badge variant="outline">
                  {analysis?.samples ?? 0} samples
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="score-number">{analysis?.medianPoints ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  median observed points
                </p>
                <div className="mini-stats">
                  <span>
                    <strong>{analysis?.medianActiveFuel ?? 0}</strong> median
                    active FUEL
                  </span>
                  <span>
                    <strong>
                      {analysis?.medianFuelPerCycle.toFixed(1) ?? '0.0'}
                    </strong>{' '}
                    FUEL / cycle
                  </span>
                  <span>
                    <strong>{analysis?.pointStdDev.toFixed(1) ?? '0.0'}</strong>{' '}
                    point deviation
                  </span>
                  <span>
                    <strong>
                      {analysis?.averageDefense.toFixed(1) ?? '0.0'}
                    </strong>{' '}
                    defense rating
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Reliability and coverage</CardTitle>
              </CardHeader>
              <CardContent className="mini-stats">
                <span>
                  <strong>
                    {Math.round((analysis?.towerSuccessRate ?? 0) * 100)}%
                  </strong>{' '}
                  tower success
                </span>
                <span>
                  <strong>
                    {Math.round((analysis?.disabledRate ?? 0) * 100)}%
                  </strong>{' '}
                  disabled rate
                </span>
                <span>
                  <strong>
                    {Math.round((analysis?.coverage ?? 0) * 100)}%
                  </strong>{' '}
                  data coverage
                </span>
                <span>
                  <strong>{analysis?.scheduledMatches ?? 0}</strong> scheduled
                  matches
                </span>
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedTeam ? `Team ${selectedTeam} trends` : 'Team trends'}
                </CardTitle>
                <Badge variant="outline">Match by match</Badge>
              </CardHeader>
              <CardContent>
                <TeamTrendChart trends={analysis?.trends ?? []} />
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Submitted entries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {analysis?.entries.map((entry) => (
                  <div className="schedule-row" key={entry.id}>
                    <strong>
                      {entry.matchKey.split('_').at(-1)?.toUpperCase()}
                    </strong>
                    <span>
                      {entry.scoutName}
                      {entry.reopened ? ' · reopened' : ''}
                    </span>
                    {eventPack &&
                    canReopenEntries(eventPack.role) &&
                    !entry.reopened ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void reopenEntry(entry.id)}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <small>{entry.reopened ? 'Editable' : 'Locked'}</small>
                    )}
                  </div>
                ))}
                {analysis?.entries.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No synchronized entries for this team yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Admin' && isAdmin && adminSection === 'settings' && (
          <div className="grid gap-4 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <KeyRound /> Team invite code
                </CardTitle>
                <Badge
                  variant={inviteCodeConfigured ? 'outline' : 'destructive'}
                >
                  {inviteCodeConfigured ? 'Configured' : 'Signup closed'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  New accounts must enter this code. Changing it takes effect
                  immediately and does not sign out existing members. Only
                  owners and admins can reveal or change it.
                </p>
                {storedInviteCode ? (
                  <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 text-sm">
                      {inviteCodeVisible
                        ? storedInviteCode
                        : '•'.repeat(Math.min(storedInviteCode.length, 24))}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={
                        inviteCodeVisible
                          ? 'Hide invite code'
                          : 'Show invite code'
                      }
                      onClick={() => setInviteCodeVisible(!inviteCodeVisible)}
                    >
                      {inviteCodeVisible ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(storedInviteCode)
                          .then(() =>
                            setInviteCodeMessage('Invite code copied.'),
                          )
                          .catch(() =>
                            setInviteCodeMessage(
                              'Could not copy automatically. Reveal and select the code manually.',
                            ),
                          );
                      }}
                    >
                      <Copy /> Copy
                    </Button>
                  </div>
                ) : inviteCodeConfigured ? (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    The existing code was saved before codes could be revealed.
                    Set a new code below once; it will then be available here.
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Enter a new invite code"
                    aria-label="New team invite code"
                  />
                  <Button
                    onClick={() => void updateInviteCode()}
                    disabled={inviteCodeBusy || inviteCode.trim().length < 8}
                  >
                    {inviteCodeBusy ? 'Saving…' : 'Set invite code'}
                  </Button>
                </div>
                {inviteCodeMessage && (
                  <output className="block text-sm text-muted-foreground">
                    {inviteCodeMessage}
                  </output>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <Shield /> TBA webhook verification
                </CardTitle>
                <Badge variant={tbaVerification ? 'outline' : 'secondary'}>
                  {tbaVerification ? 'Code received' : 'Waiting for code'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  TBA generates the webhook secret. Copy its displayed secret
                  into the staging GitHub environment, redeploy, and then click
                  Resend code on TBA.
                </p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Worker secret
                    </p>
                    <p className="font-medium">
                      {tbaWebhookStatus.configured
                        ? 'Configured'
                        : 'Missing TBA_WEBHOOK_SECRET'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Last delivery
                    </p>
                    <p className="font-medium">
                      {!tbaWebhookStatus.delivery
                        ? 'Nothing received'
                        : tbaWebhookStatus.delivery.status === 'accepted'
                          ? `Accepted${tbaWebhookStatus.delivery.messageType ? `: ${tbaWebhookStatus.delivery.messageType}` : ''}`
                          : tbaWebhookStatus.delivery.status ===
                              'rejected_signature'
                            ? 'Rejected: secret does not match'
                            : 'Rejected: invalid payload'}
                    </p>
                    {tbaWebhookStatus.delivery && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          tbaWebhookStatus.delivery.lastReceivedAt,
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                {tbaVerification && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      Received{' '}
                      {new Date(tbaVerification.receivedAt).toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 text-sm">
                        {tbaVerification.verificationCode}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(tbaVerification.verificationCode)
                            .then(() =>
                              setTbaVerificationMessage('Code copied.'),
                            )
                            .catch(() =>
                              setTbaVerificationMessage(
                                'Could not copy automatically. Select the code manually.',
                              ),
                            );
                        }}
                      >
                        <Copy /> Copy code
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTbaVerificationMessage('Checking for a new code…');
                      void fetch('/api/tba-webhook-verification')
                        .then(async (response) => {
                          const result = (await response.json()) as {
                            verification?: typeof tbaVerification;
                            configured?: boolean;
                            delivery?: (typeof tbaWebhookStatus)['delivery'];
                            error?: string;
                          };
                          if (!response.ok)
                            throw new Error(
                              result.error ?? 'Could not retrieve the code.',
                            );
                          setTbaVerification(result.verification ?? null);
                          setTbaWebhookStatus({
                            configured: Boolean(result.configured),
                            delivery: result.delivery ?? null,
                          });
                          setTbaVerificationMessage(
                            result.verification
                              ? 'Latest code loaded.'
                              : 'No verification code has been received yet.',
                          );
                        })
                        .catch((error: unknown) =>
                          setTbaVerificationMessage(
                            error instanceof Error
                              ? error.message
                              : 'Could not retrieve the code.',
                          ),
                        );
                    }}
                  >
                    <RefreshCw /> Refresh code
                  </Button>
                  {tbaVerification && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void fetch('/api/tba-webhook-verification', {
                          method: 'DELETE',
                        }).then((response) => {
                          if (response.ok) {
                            setTbaVerification(null);
                            setTbaVerificationMessage('Stored code cleared.');
                          }
                        });
                      }}
                    >
                      Clear stored code
                    </Button>
                  )}
                </div>
                {tbaVerificationMessage && (
                  <output className="block text-sm text-muted-foreground">
                    {tbaVerificationMessage}
                  </output>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Current event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose one of Team 401's registered events from The Blue
                  Alliance. Its schedule will be cached on every device.
                </p>
                <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
                  <Input
                    aria-label="FRC season"
                    type="number"
                    min="1992"
                    max="2100"
                    value={eventYear}
                    onChange={(event) =>
                      setEventYear(Number(event.target.value))
                    }
                  />
                  <select
                    aria-label="Team 401 event"
                    className="h-10 rounded-md border bg-transparent px-3"
                    value={eventKey}
                    onChange={(event) => setEventKey(event.target.value)}
                    disabled={eventsLoading}
                  >
                    <option value="">
                      {eventsLoading
                        ? 'Loading Team 401 events…'
                        : 'Select an event'}
                    </option>
                    {eventChoices.map((event) => (
                      <option value={event.key} key={event.key}>
                        {event.name}
                        {event.date ? ` · ${event.date}` : ''}
                        {event.location ? ` · ${event.location}` : ''}
                      </option>
                    ))}
                  </select>
                  <Button
                    disabled={
                      configuringEvent || !online || !session || !eventKey
                    }
                    onClick={configureEvent}
                  >
                    {configuringEvent ? 'Loading…' : 'Load event pack'}
                  </Button>
                </div>
                {eventMessage && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {eventMessage}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <WandSparkles />
                  Bulk scout assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Select scouts once, then distribute all six stations in a
                  balanced rotation. Individual stations can still be adjusted
                  on Schedule.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {eventPack?.members.map((member) => (
                    <label className="choice px-3" key={member.id}>
                      <input
                        type="checkbox"
                        checked={selectedScoutIds.includes(member.id)}
                        onChange={(event) =>
                          setSelectedScoutIds((ids) =>
                            event.target.checked
                              ? [...ids, member.id]
                              : ids.filter((id) => id !== member.id),
                          )
                        }
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 text-sm">
                    Start match
                    <Input
                      type="number"
                      min="1"
                      value={assignmentStart}
                      onChange={(event) =>
                        setAssignmentStart(Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    End match
                    <Input
                      type="number"
                      min="1"
                      value={assignmentEnd}
                      onChange={(event) =>
                        setAssignmentEnd(Number(event.target.value))
                      }
                    />
                  </label>
                  <Button
                    disabled={!selectedScoutIds.length}
                    onClick={generateAssignments}
                  >
                    <WandSparkles />
                    Generate rotation
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assignment coverage</CardTitle>
                <Badge variant="outline">
                  {eventPack?.assignments.length ?? 0}/{totalSlots}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="coverage-track">
                  <span
                    style={{
                      width: `${totalSlots ? Math.min(100, ((eventPack?.assignments.length ?? 0) / totalSlots) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-3 grid gap-1 sm:grid-cols-2">
                  {assignmentCounts.map(({ member, count }) => (
                    <div className="schedule-row" key={member.id}>
                      <strong>{count}</strong>
                      <span>{member.name}</span>
                      <small>slots</small>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    setScheduleFilter('unassigned');
                    setAdminSection('assignments');
                  }}
                >
                  Review unassigned matches
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Team members and roles</CardTitle>
                <Badge variant="outline">
                  {eventPack?.members.length ?? 0} accounts
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                {eventPack?.members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div>
                      <strong>{member.name}</strong>
                      <small>{member.email}</small>
                      {Boolean(member.disabled) && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                    {member.role === 'owner' ? (
                      <Badge>Owner</Badge>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          void updateMemberRole(member.id, event.target.value)
                        }
                      >
                        <option value="admin">Admin</option>
                        <option value="strategy">Strategy</option>
                        <option value="scout">Scout</option>
                        <option value="video">Video</option>
                      </select>
                    )}
                    {member.role !== 'owner' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void setMemberDisabled(
                              member.id,
                              !Boolean(member.disabled),
                            )
                          }
                        >
                          {member.disabled ? 'Enable' : 'Disable'}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${member.name}`}
                          onClick={() =>
                            void removeMember(member.id, member.name)
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {adminMessage && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {adminMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Settings' && (
          <div className="grid gap-4 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Display settings</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Color theme</p>
                  <p className="text-sm text-muted-foreground">
                    Choose the theme for this device.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setDark(!dark)}>
                  {dark ? (
                    <>
                      <Sun />
                      Use light mode
                    </>
                  ) : (
                    <>
                      <Moon />
                      Use dark mode
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <MonitorSmartphone /> Signed-in devices
                </CardTitle>
                <Badge variant="outline">{accountSessions.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {accountSessions.map((item) => (
                  <div className="schedule-row" key={item.id}>
                    <strong>
                      {item.id === currentSessionId ? 'This device' : 'Session'}
                    </strong>
                    <span>
                      {item.userAgent?.split(' ').slice(0, 4).join(' ') ??
                        'Unknown device'}
                      {item.ipAddress ? ` · ${item.ipAddress}` : ''}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void revokeSession(item.id)}
                    >
                      {item.id === currentSessionId ? 'Sign out' : 'Revoke'}
                    </Button>
                  </div>
                ))}
                {!accountSessions.length && (
                  <p className="text-sm text-muted-foreground">
                    No active sessions were found.
                  </p>
                )}
                {sessionMessage && (
                  <p className="text-sm text-muted-foreground">
                    {sessionMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </section>
      <nav aria-label="Mobile navigation" className="mobile-nav">
        {visibleNav.map(({ label, icon: Icon }) => (
          <button
            type="button"
            aria-current={activeView === label ? 'page' : undefined}
            onClick={() => navigate(label)}
            className={activeView === label ? 'active' : ''}
            key={label}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('Admin')}
            className={activeView === 'Admin' ? 'active' : ''}
          >
            <UserCog />
            <span>Admin</span>
          </button>
        )}
      </nav>
    </main>
  );
}
