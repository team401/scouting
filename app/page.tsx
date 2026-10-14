'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Cloud,
  CloudOff,
  Film,
  Handshake,
  KeyRound,
  LayoutDashboard,
  Map,
  Menu,
  Minus,
  Moon,
  Plus,
  QrCode,
  RefreshCw,
  Sun,
  Upload,
  UserCog,
  Users,
  Wrench,
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
import { ShiftScheduler } from '@/components/shift-scheduler';
import { QrRelay } from '@/components/qr-relay';
import { MatchSubmissionQr } from '@/components/match-submission-qr';
import { GuestPassManager } from '@/components/guest-pass-manager';
import {
  getCachedValue,
  getDraft,
  getPendingMutations,
  queueMutation,
  saveCachedValue,
  saveDraft,
  synchronizePendingMutations,
  type PendingMutation,
} from '@/lib/offline-db';
import { observedPoints, type ScoutingPayload } from '@/lib/scouting-metrics';
import {
  canManageAssignments,
  canReopenEntries,
  scoutEntryMutationId,
} from '@/lib/scouting-policy';

type View =
  | 'Home'
  | 'Scout'
  | 'Pit'
  | 'Plan'
  | 'Data'
  | 'Video'
  | 'Alliance'
  | 'Offline transfer'
  | 'Admin'
  | 'Account';

const nav: {
  label: Exclude<View, 'Account' | 'Admin'>;
  icon: typeof ClipboardList;
}[] = [
  { label: 'Home', icon: LayoutDashboard },
  { label: 'Scout', icon: ClipboardList },
  { label: 'Pit', icon: Wrench },
  { label: 'Plan', icon: Map },
  { label: 'Data', icon: Users },
  { label: 'Video', icon: Film },
  { label: 'Alliance', icon: Handshake },
  { label: 'Offline transfer', icon: QrCode },
];

type EventPack = {
  event: {
    id: string;
    year: number;
    key: string;
    name: string;
    updatedAt: number;
    timezone: string | null;
  };
  matches: EventMatch[];
  teams: { teamNumber: number; name: string }[];
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
  scoutEntries: Array<{
    matchId: string;
    teamNumber: number;
    station: string;
    payload: MatchDraft;
    updatedAt: number;
  }>;
  scoutShifts: Array<{
    id: string;
    station: string;
    startsAt: number;
    endsAt: number;
  }>;
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
  fuelCapacity: number;
  climbCapability: string;
  fieldAccess: string;
  fieldAccessPreference: string;
  shooterMount: string;
  shooterBarrels: string;
  adjustableHood: boolean;
  autonomousStart: string[];
  autonomousSwipe: string[];
  autonomousDepot: boolean;
  autonomousNotes: string;
  notes: string;
};
type PitEntry = {
  teamNumber: number;
  scoutUserId: string;
  scoutName: string;
  drivetrain: string | null;
  swerveModule: string | null;
  motorTypes: string[];
  weightLbs: number | null;
  payload: Partial<PitDraft>;
  photoObjectKey: string | null;
  updatedAt: number;
};
const emptyPitDraft: PitDraft = {
  drivetrain: 'Swerve',
  swerveModule: '',
  motorTypes: '',
  weightLbs: 0,
  fuelCapacity: 0,
  climbCapability: 'None',
  fieldAccess: 'Both',
  fieldAccessPreference: 'No preference',
  shooterMount: 'Fixed',
  shooterBarrels: '1',
  adjustableHood: false,
  autonomousStart: ['Unknown'],
  autonomousSwipe: ['None'],
  autonomousDepot: false,
  autonomousNotes: '',
  notes: '',
};

function normalizeSelections(value: unknown, fallback: string): string[] {
  if (Array.isArray(value)) {
    const selections = value.filter(
      (item): item is string => typeof item === 'string' && item.length > 0,
    );
    return selections.length > 0 ? selections : [fallback];
  }
  return [fallback];
}

function displaySelections(value: unknown, fallback = 'Unknown') {
  if (Array.isArray(value)) {
    const selections = value.filter((item): item is string => typeof item === 'string');
    return selections.length ? selections.join(', ') : fallback;
  }
  return typeof value === 'string' && value ? value : fallback;
}

function toggleSelection(
  selections: string[],
  value: string,
  emptyValue: string,
): string[] {
  if (value === emptyValue) return [emptyValue];
  const active = selections.filter((item) => item !== emptyValue);
  const next = active.includes(value)
    ? active.filter((item) => item !== value)
    : [...active, value];
  return next.length > 0 ? next : [emptyValue];
}

function shooterSummary(payload: Partial<PitDraft>) {
  const mount = payload.shooterMount ?? '—';
  const barrels = payload.shooterBarrels ?? '—';
  const hood = payload.adjustableHood ? 'adjustable hood' : 'fixed hood';
  const barrelDescription =
    barrels === 'Drum'
      ? 'drum'
      : `${barrels} ${barrels === '1' ? 'barrel' : 'barrels'}`;
  return `${mount} · ${barrelDescription} · ${hood}`;
}

type EventMatch = {
  id: string;
  key: string;
  compLevel: string;
  matchNumber: number;
  scheduledAt: number | null;
  predictedAt: number | null;
  alliances: { red: number[]; blue: number[] };
  videos: Array<{ type: string; key: string }>;
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

function matchHeaderLabel(match: EventMatch) {
  const prefix: Record<string, string> = {
    qm: 'Quals',
    ef: 'Eighthfinal',
    qf: 'Quarterfinal',
    sf: 'Semifinal',
    f: 'Final',
  };
  return `${prefix[match.compLevel] ?? match.compLevel.toUpperCase()} ${match.matchNumber}`;
}

type MatchDraft = ScoutingPayload;

type TeamAnalysis = {
  teamNumber: number;
  epa: number | null;
  opr: number | null;
  eventRank: number | null;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  samples: number;
  scheduledMatches: number;
  coverage: number;
  medianPoints: number;
  medianActiveFuel: number;
  towerSuccessRate: number;
  disabledRate: number;
  averageDefense: number;
  pointStdDev: number;
  trends?: TeamTrend[];
  pit?: {
    drivetrain: string | null;
    swerveModule: string | null;
    motorTypes: string[];
    weightLbs: number | null;
    payload: Partial<PitDraft>;
    photoObjectKey: string | null;
  } | null;
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
  notes: string;
  absentTeams: number[];
  board: TacticalBoardData;
  autoBoard: TacticalBoardData;
};
const emptyMatchPlan: MatchPlan = {
  notes: '',
  absentTeams: [],
  board: { robots: [], strokes: [] },
  autoBoard: { robots: [], strokes: [] },
};

function planForMatch(
  plan: MatchPlan | null | undefined,
  match: EventMatch,
): MatchPlan {
  const defaultRobots = initialRobotMarkers(
    match.alliances.red,
    match.alliances.blue,
  );
  const scheduledTeams = new Set(defaultRobots.map((robot) => robot.team));
  const absentTeams = (plan?.absentTeams ?? []).filter((team) =>
    scheduledTeams.has(team),
  );
  const availableRobots = defaultRobots.filter(
    (robot) => !absentTeams.includes(robot.team),
  );
  const expectedTeams = availableRobots
    .map((robot) => robot.team)
    .sort((a, b) => a - b);
  const savedTeams = (plan?.board?.robots ?? [])
    .map((robot) => robot.team)
    .sort((a, b) => a - b);
  const savedBoardMatches =
    savedTeams.length === expectedTeams.length &&
    savedTeams.every((team, index) => team === expectedTeams[index]);
  const robots = savedBoardMatches
    ? (plan?.board?.robots ?? []).map((robot) => {
        const assignment = availableRobots.find(
          (candidate) => candidate.team === robot.team,
        );
        return assignment
          ? {
              ...robot,
              alliance: assignment.alliance,
              station: assignment.station,
            }
          : robot;
      })
    : availableRobots;
  const savedAutoTeams = (plan?.autoBoard?.robots ?? [])
    .map((robot) => robot.team)
    .sort((a, b) => a - b);
  const savedAutoBoardMatches =
    savedAutoTeams.length === expectedTeams.length &&
    savedAutoTeams.every((team, index) => team === expectedTeams[index]);
  const autoRobots = savedAutoBoardMatches
    ? (plan?.autoBoard?.robots ?? []).map((robot) => {
        const assignment = availableRobots.find(
          (candidate) => candidate.team === robot.team,
        );
        return assignment ? { ...robot, alliance: assignment.alliance, station: assignment.station } : robot;
      })
    : availableRobots;

  return {
    ...emptyMatchPlan,
    ...plan,
    absentTeams,
    board: {
      robots,
      strokes: plan?.board?.strokes ?? [],
    },
    autoBoard: {
      robots: autoRobots,
      strokes: plan?.autoBoard?.strokes ?? [],
    },
  };
}

function Counter({
  label,
  value,
  onChange,
  quickAdds = [],
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  quickAdds?: number[];
}) {
  return (
    <div className="counter-row">
      <div>
        <p className="font-semibold">{label}</p>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamsSection, setTeamsSection] = useState<
    'analysis' | 'picklist' | 'review'
  >('analysis');
  const [rankingSort, setRankingSort] = useState<'rank' | 'team'>('rank');
  const navigationDepthRef = useRef(0);
  const selectedMatchKeyRef = useRef('');
  const loadedPlanMatchIdRef = useRef('');
  const [autoFuel, setAutoFuel] = useState(0);
  const [activeFuel, setActiveFuel] = useState(0);
  const [centerSwipes, setCenterSwipes] = useState(0);
  const [passedFuel, setPassedFuel] = useState(0);
  const [autoDepot, setAutoDepot] = useState(false);
  const [autoOutpost, setAutoOutpost] = useState(false);
  const [autoPenalties, setAutoPenalties] = useState(0);
  const [teleopPenalties, setTeleopPenalties] = useState(0);
  const [scoutingPhase, setScoutingPhase] = useState<
    'pre' | 'auto' | 'tele' | 'post'
  >('pre');
  const [autoTower, setAutoTower] = useState('None');
  const [autoStartPosition, setAutoStartPosition] = useState('');
  const [tower, setTower] = useState('');
  const [path, setPath] = useState('');
  const [dark, setDark] = useState(false);
  const [_saved, setSaved] = useState(false);
  const [defenseRating, setDefenseRating] = useState<
    number | null | undefined
  >(undefined);
  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [noShow, setNoShow] = useState(false);
  const [shootingRange, setShootingRange] = useState('');
  const [notes, setNotes] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [_syncMessage, setSyncMessage] = useState('');
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
  const [selectedVideoMatchKey, setSelectedVideoMatchKey] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState('');
  const [analysis, setAnalysis] = useState<TeamAnalysis | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [strategyTeams, setStrategyTeams] = useState<TeamAnalysis[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<
    'all' | 'active' | 'disabled' | 'guests'
  >('active');
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [adminSection, setAdminSection] = useState<'settings' | 'assignments'>(
    'settings',
  );
  const [assignmentMode, setAssignmentMode] = useState<'time' | 'match'>('time');
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
  const [planMessage, setPlanMessage] = useState('');
  const [planAuthor, setPlanAuthor] = useState('');
  const [planUpdatedAt, setPlanUpdatedAt] = useState<number | null>(null);
  const [planStats, setPlanStats] = useState<TeamAnalysis[]>([]);
  const [planSection, setPlanSection] = useState<
    'auto' | 'teleop' | 'metrics'
  >('auto');
  const organizationTeamNumber = eventPack?.organizationTeamNumber ?? 401;
  const planningMatches =
    eventPack?.matches.filter((match) =>
      [...match.alliances.red, ...match.alliances.blue].includes(
        organizationTeamNumber,
      ),
    ) ?? [];
  const videoMatches = planningMatches;
  const currentMatch = eventPack?.matches.find(
    (match) => match.key === selectedMatchKey,
  );
  const selectedVideoMatch = videoMatches.find(
    (match) => match.key === selectedVideoMatchKey,
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
  const [submittedMatchMutation, setSubmittedMatchMutation] =
    useState<PendingMutation | null>(null);
  const [videoReview, setVideoReview] = useState<{
    matchId: string;
    teamNumber: number;
    station: string;
  } | null>(null);
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
    centerSwipes,
    passedFuel,
    autoDepot,
    autoOutpost,
    autoPenalties,
    teleopPenalties,
    autoTower,
    autoStartPosition,
    tower,
    path,
    defenseRating,
    disabled: disabled ?? false,
    noShow,
    penalties: autoPenalties + teleopPenalties,
    shootingRange,
    notes,
  };
  const estimatedPoints = noShow ? 0 : observedPoints(currentPayload);
  const scoutingPhases = ['pre', 'auto', 'tele', 'post'] as const;

  function moveToScoutingPhase(
    target: (typeof scoutingPhases)[number],
  ) {
    if (noShow) {
      if (target === 'auto' || target === 'tele') return;
      setSaveError('');
      setScoutingPhase(target);
      return;
    }

    const currentIndex = scoutingPhases.indexOf(scoutingPhase);
    const targetIndex = scoutingPhases.indexOf(target);
    if (targetIndex <= currentIndex) {
      setSaveError('');
      setScoutingPhase(target);
      return;
    }

    const incompletePhase = scoutingPhases
      .slice(currentIndex, targetIndex)
      .find((phase) => {
        if (phase === 'pre') return !autoStartPosition;
        return false;
      });
    if (incompletePhase === 'pre') {
      setSaveError('Choose a starting position before continuing.');
      return;
    }
    setSaveError('');
    setScoutingPhase(target);
  }
  const pitDraftId =
    eventPack && pitTeam ? `pit-${eventPack.event.key}-${pitTeam}` : null;
  const existingPitPhoto = pitTeam
    ? eventPack?.pitEntries.find((entry) => entry.teamNumber === pitTeam)
        ?.photoObjectKey
    : null;
  const isAdmin = Boolean(eventPack && canManageAssignments(eventPack.role));
  const canUseStrategy = Boolean(eventPack && canReopenEntries(eventPack.role));
  const isGuest = Boolean(eventPack?.userId.startsWith('guest:'));
  const canUsePickLists = Boolean(eventPack && !isGuest);
  const visibleNav = nav.filter(
    ({ label }) =>
      label === 'Data' ||
      (label === 'Video' ? !isGuest :
        !['Plan', 'Alliance'].includes(label) || canUseStrategy),
  );

  function navigate(view: View) {
    setMobileMenuOpen(false);
    if (view === activeView) return;
    navigationDepthRef.current += 1;
    const url = new URL(window.location.href);
    url.searchParams.set('view', view.toLowerCase());
    window.history.pushState(
      { scoutingApp: true, view, depth: navigationDepthRef.current },
      '',
      url,
    );
    setActiveView(view);
  }

  function replaceView(view: View) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view.toLowerCase());
    window.history.replaceState(
      { scoutingApp: true, view, depth: navigationDepthRef.current },
      '',
      url,
    );
    setActiveView(view);
  }

  useEffect(() => {
    const views: View[] = [
      'Home',
      'Scout',
      'Pit',
      'Plan',
      'Data',
      'Video',
      'Alliance',
      'Offline transfer',
      'Admin',
      'Account',
    ];
    const requested = new URL(window.location.href).searchParams.get('view');
    const initial =
      (requested?.toLowerCase() === 'settings'
        ? 'Account'
        : views.find(
            (view) => view.toLowerCase() === requested?.toLowerCase(),
          )) ??
      'Home';
    window.history.replaceState(
      { scoutingApp: true, view: initial, depth: 0 },
      '',
      window.location.href,
    );
    setActiveView(initial);
    const handleHistory = (event: PopStateEvent) => {
      const state = event.state as {
        scoutingApp?: boolean;
        view?: View;
        depth?: number;
      } | null;
      if (!state?.scoutingApp || !state.view) return;
      navigationDepthRef.current = state.depth ?? 0;
      setActiveView(state.view);
    };
    window.addEventListener('popstate', handleHistory);
    return () => window.removeEventListener('popstate', handleHistory);
  }, []);

  useEffect(() => {
    selectedMatchKeyRef.current = selectedMatchKey;
  }, [selectedMatchKey]);

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
        const serverEntry = eventPack?.scoutEntries?.find(
          (entry) =>
            entry.matchId === currentMatch?.id &&
            entry.teamNumber === selectedTeam,
        );
        const payload =
          draft && (!serverEntry || draft.updatedAt >= serverEntry.updatedAt)
            ? draft.payload
            : serverEntry?.payload;
        if (payload) {
          const didNotShow = payload.noShow ?? false;
          setAutoFuel(payload.autoFuel);
          setActiveFuel(payload.activeFuel);
          setCenterSwipes(payload.centerSwipes ?? 0);
          setPassedFuel(payload.passedFuel ?? 0);
          setAutoDepot(payload.autoDepot ?? false);
          setAutoOutpost(payload.autoOutpost ?? false);
          setAutoPenalties(payload.autoPenalties ?? 0);
          setTeleopPenalties(
            payload.teleopPenalties ?? payload.penalties ?? 0,
          );
          setAutoTower(payload.autoTower ?? 'None');
          setAutoStartPosition(
            payload.autoStartPosition ?? '',
          );
          setTower(payload.tower ?? '');
          setPath(payload.path ?? '');
          setDefenseRating(
            payload.defenseRating === undefined
              ? undefined
              : payload.defenseRating,
          );
          setDisabled(payload.disabled ?? null);
          setNoShow(didNotShow);
          setShootingRange(payload.shootingRange ?? '');
          setNotes(payload.notes ?? '');
        } else {
          setAutoFuel(0);
          setActiveFuel(0);
          setCenterSwipes(0);
          setPassedFuel(0);
          setAutoDepot(false);
          setAutoOutpost(false);
          setAutoPenalties(0);
          setTeleopPenalties(0);
          setAutoTower('None');
          setAutoStartPosition('');
          setTower('');
          setPath('');
          setDefenseRating(undefined);
          setDisabled(null);
          setNoShow(false);
          setShootingRange('');
          setNotes('');
        }
        setDraftReady(true);
      })
      .catch(() => {
        setSaveError('Offline storage is unavailable on this device.');
        setDraftReady(true);
      });
  }, [currentMatch?.id, draftId, eventPack?.scoutEntries, selectedTeam]);

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
    if (!isPending && !session) window.location.replace('/sign-in');
  }, [isPending, session]);

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
    if (activeView !== 'Data' || !selectedTeam || !online)
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
    if (
      !['Plan', 'Data', 'Alliance'].includes(activeView) ||
      (activeView !== 'Data' && !canUseStrategy) ||
      !online ||
      !session
    )
      return;
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
    if (!eventPack) return;
    if (
      (activeView === 'Admin' && !isAdmin) ||
      (activeView === 'Plan' && !canUseStrategy) ||
      (activeView === 'Video' && isGuest)
    )
      replaceView('Home');
  }, [activeView, canUseStrategy, eventPack, isAdmin, isGuest]);

  useEffect(() => {
    if (
      eventPack &&
      !canUseStrategy &&
      (activeView === 'Plan' || activeView === 'Alliance')
    )
      replaceView('Home');
  }, [activeView, canUseStrategy, eventPack]);

  useEffect(() => {
    if (isGuest && teamsSection !== 'analysis') setTeamsSection('analysis');
    else if (!canUseStrategy && teamsSection === 'review')
      setTeamsSection('analysis');
  }, [canUseStrategy, isGuest, teamsSection]);

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
    if (activeView !== 'Account' || !session || !online) return;
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
    if (activeView !== 'Video') return;
    if (videoMatches.length === 0) return;
    if (!videoMatches.some((match) => match.key === selectedVideoMatchKey))
      setSelectedVideoMatchKey(videoMatches[0].key);
  }, [activeView, selectedVideoMatchKey, videoMatches]);

  useEffect(() => {
    if (activeView !== 'Plan' || !currentMatch || !session) return;
    let cancelled = false;
    loadedPlanMatchIdRef.current = '';
    setPlanMessage('');
    setPlanAuthor('');
    setPlanUpdatedAt(null);
    setMatchPlan(planForMatch(null, currentMatch));
    const cacheId = `match-plan:${currentMatch.id}`;
    const draftId = `match-plan-draft:${currentMatch.id}`;
    void Promise.all([
      getDraft<MatchPlan>(draftId),
      getCachedValue<{
        plan: MatchPlan | null;
        canEdit: boolean;
        authorName: string | null;
        updatedAt?: number | null;
      }>(cacheId),
    ]).then(([draft, cached]) => {
      if (cancelled) return;
      if (draft) setMatchPlan(planForMatch(draft.payload, currentMatch));
      else if (cached) setMatchPlan(planForMatch(cached.plan, currentMatch));
      if (cached) {
        setPlanCanEdit(cached.canEdit);
        setPlanAuthor(cached.authorName ?? '');
        setPlanUpdatedAt(cached.updatedAt ?? null);
      }
      if (!online) {
        setPlanMessage(
          'Showing the match plan saved on this device. Changes will remain a local draft until reconnected.',
        );
        loadedPlanMatchIdRef.current = currentMatch.id;
      }
    });
    if (!online)
      return () => {
        cancelled = true;
      };
    fetch(`/api/match-plans?matchId=${encodeURIComponent(currentMatch.id)}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          plan: MatchPlan | null;
          canEdit: boolean;
          authorName: string | null;
          updatedAt: number | null;
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? 'Unable to load this match plan.');
        const draft = await getDraft<MatchPlan>(draftId).catch(() => undefined);
        if (cancelled) return;
        if (!draft) setMatchPlan(planForMatch(result.plan, currentMatch));
        setPlanCanEdit(result.canEdit);
        setPlanAuthor(result.authorName ?? '');
        setPlanUpdatedAt(result.updatedAt);
        await saveCachedValue(cacheId, {
          plan: result.plan,
          canEdit: result.canEdit,
          authorName: result.authorName,
          updatedAt: result.updatedAt,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMatchPlan(planForMatch(null, currentMatch));
        setPlanCanEdit(false);
        setPlanMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load this match plan.',
        );
      })
      .finally(() => {
        if (!cancelled) loadedPlanMatchIdRef.current = currentMatch.id;
      });
    return () => {
      cancelled = true;
    };
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
    if (
      activeView !== 'Plan' ||
      !currentMatch ||
      !planCanEdit ||
      loadedPlanMatchIdRef.current !== currentMatch.id
    )
      return;

    if (!online) {
      setPlanMessage('Saved on this device. It will sync when reconnected.');
      return;
    }

    setPlanMessage('Saving changes…');
    const timer = window.setTimeout(() => void saveMatchPlan(), 700);
    return () => window.clearTimeout(timer);
  }, [activeView, currentMatch, matchPlan, online, planCanEdit]);

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
    autoDepot,
    autoFuel,
    autoOutpost,
    autoPenalties,
    autoStartPosition,
    autoTower,
    centerSwipes,
    defenseRating,
    disabled,
    draftId,
    draftReady,
    noShow,
    notes,
    path,
    passedFuel,
    shootingRange,
    teleopPenalties,
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
            }
          : emptyPitDraft;
        const savedDraft = draft?.payload ?? serverDraft;
        const loadedDraft = {
          ...emptyPitDraft,
          ...savedDraft,
        };
        setPitDraft({
          ...loadedDraft,
          shooterMount: (savedDraft as Partial<PitDraft>).shooterMount ?? 'Fixed',
          autonomousStart: normalizeSelections(
            loadedDraft.autonomousStart,
            'Unknown',
          ),
          autonomousSwipe: normalizeSelections(
            loadedDraft.autonomousSwipe,
            'None',
          ),
        });
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
    const missingFields = noShow
      ? []
      : [
          !autoStartPosition && 'autonomous starting position',
          !path && 'field movement',
          defenseRating === undefined && 'whether the robot played defense',
          !shootingRange && 'shooting range',
          !tower && 'endgame tower',
          disabled === null && 'reliability',
        ].filter((field): field is string => Boolean(field));
    if (missingFields.length > 0) {
      setSaveError(`Complete: ${missingFields.join(', ')}.`);
      return;
    }
    if (
      !noShow &&
      [
        autoFuel,
        activeFuel,
        centerSwipes,
        passedFuel,
        autoPenalties,
        teleopPenalties,
      ].some(
        (value) => !Number.isInteger(value) || value < 0,
      )
    ) {
      setSaveError('All counts must be zero or a positive whole number.');
      return;
    }
    setSaveError('');
    try {
      const mutation: PendingMutation = {
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
          reviewSource: videoReview ? 'video_review' : 'live',
          ...(noShow
            ? {
                ...currentPayload,
                autoFuel: 0,
                activeFuel: 0,
                centerSwipes: 0,
                passedFuel: 0,
                autoDepot: false,
                autoOutpost: false,
                autoPenalties: 0,
                teleopPenalties: 0,
                autoTower: 'None',
                autoStartPosition: 'None',
                tower: 'None',
                path: 'None',
                defenseRating: null,
                disabled: false,
                penalties: 0,
                shootingRange: 'None',
              }
            : currentPayload),
        },
      };
      await queueMutation(mutation);
      setSubmittedMatchMutation(mutation);
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
    if (pitDraft.weightLbs <= 0) {
      setPitMessage('Enter the robot weight before saving the pit report.');
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
            timezone: null,
          },
          pitEntries: result.pitEntries ?? [],
          scoutEntries: result.scoutEntries ?? [],
          scoutShifts: result.scoutShifts ?? [],
          organizationId: result.organizationId ?? 'team-401',
        } as EventPack;
        setEventPack(emptyPack);
        setEventKey('');
        return;
      }
      const pack = {
        ...result,
        pitEntries: result.pitEntries ?? [],
        scoutEntries: result.scoutEntries ?? [],
        scoutShifts: result.scoutShifts ?? [],
        organizationId: result.organizationId ?? 'team-401',
      } as EventPack;
      setEventPack(pack);
      setEventKey(pack.event.key);
      await saveCachedValue('current-event-pack', pack);
      if (!selectedMatchKeyRef.current && pack.matches.length > 0) {
        const mine = pack.assignments
          .filter((assignment) => assignment.scoutUserId === pack.userId)
          .map((assignment) => ({
            assignment,
            match: pack.matches.find((item) => item.id === assignment.matchId),
          }))
          .filter((item) => item.match && !item.match.result?.actualTime)
          .sort(
            (a, b) =>
              (a.match?.predictedAt ?? a.match?.scheduledAt ?? Infinity) -
              (b.match?.predictedAt ?? b.match?.scheduledAt ?? Infinity),
          )[0]?.assignment;
        const match =
          pack.matches.find((item) => item.id === mine?.matchId) ??
          pack.matches[0];
        selectedMatchKeyRef.current = match.key;
        setSelectedMatchKey(match.key);
        setSelectedTeam(mine?.teamNumber ?? match.alliances.red[0]);
        setSelectedStation(mine?.station ?? 'red1');
      }
    } catch (error) {
      const cached = await getCachedValue<EventPack>(
        'current-event-pack',
      ).catch(() => undefined);
      if (cached) {
        const pack = {
          ...cached,
          pitEntries: cached.pitEntries ?? [],
          scoutEntries: cached.scoutEntries ?? [],
          scoutShifts: cached.scoutShifts ?? [],
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
    selectedMatchKeyRef.current = match.key;
    setSelectedMatchKey(match.key);
    setSelectedTeam(team);
    setSelectedStation(station);
    setSaved(false);
    setSubmissionStatus('draft');
    setSubmittedMatchMutation(null);
    setVideoReview(null);
    setScoutingPhase('pre');
    navigate('Scout');
  }

  function startVideoReview(issue: {
    matchId: string;
    teamNumber: number;
    station: string;
  }) {
    const match = eventPack?.matches.find((item) => item.id === issue.matchId);
    if (!match) return;
    selectAssignment(match, issue.teamNumber, issue.station);
    setVideoReview(issue);
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
    if (!window.confirm(`Remove ${name} from Scouting? Their historical scouting data will be kept.`))
      return;
    setAdminMessage('');
    const response = await fetch('/api/members', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setAdminMessage(result.error ?? 'Could not remove the account.');
      return;
    }
    setAdminMessage('Account removed from Scouting.');
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

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('The new passwords do not match.');
      return;
    }
    setChangingPassword(true);
    const response = await fetch('/api/auth/firebase-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setChangingPassword(false);
    if (!response.ok) {
      setPasswordMessage(result?.error ?? 'Could not change your password.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage(
      'Password changed for both Scouting and Ops. Other scouting sessions were signed out.',
    );
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
    setPlanMessage('Saving changes…');
    try {
      const response = await fetch('/api/match-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ matchId: currentMatch.id, ...matchPlan }),
      });
      const result = (await response.json()) as {
        error?: string;
        authorName?: string;
        updatedAt?: number;
      };
      if (!response.ok)
        throw new Error(result.error ?? 'Unable to save this match plan.');
      setPlanAuthor(result.authorName ?? session?.user.name ?? '');
      const savedAt = result.updatedAt ?? Date.now();
      setPlanUpdatedAt(savedAt);
      await saveCachedValue(`match-plan:${currentMatch.id}`, {
        plan: matchPlan,
        canEdit: true,
        authorName: result.authorName ?? session?.user.name ?? null,
        updatedAt: savedAt,
      });
      await saveDraft({
        id: `match-plan-draft:${currentMatch.id}`,
        payload: matchPlan,
        updatedAt: Date.now(),
      });
      setPlanMessage('');
    } catch (error) {
      setPlanMessage(
        error instanceof Error
          ? error.message
          : 'Unable to save this match plan.',
      );
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
  const reopenedEntries =
    eventPack?.scoutEntries.filter(
      (entry) =>
        (entry.payload as MatchDraft & { reopened?: boolean }).reopened,
    ) ?? [];
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
          pit: eventPack?.pitEntries.find((item) => item.teamNumber === team),
          name: eventPack?.teams?.find((item) => item.teamNumber === team)?.name,
        }),
      )
    : [];
  const selectedStrategyTeam = strategyTeams.find(
    (team) => team.teamNumber === selectedTeam,
  );
  const totalSlots = (eventPack?.matches.length ?? 0) * 6;
  const currentMatchYoutubeVideo = currentMatch?.videos?.find(
    (video) => video.type === 'youtube',
  );
  const assignmentCounts =
    eventPack?.members.map((member) => ({
      member,
      count: eventPack.assignments.filter(
        (assignment) => assignment.scoutUserId === member.id,
      ).length,
    })) ?? [];
  const filteredMembers =
    eventPack?.members.filter((member) => {
      const guest = member.email.endsWith('@guest.invalid');
      const matchesSearch = `${member.name} ${member.email}`
        .toLowerCase()
        .includes(memberSearch.trim().toLowerCase());
      const matchesFilter =
        memberFilter === 'all' ||
        (memberFilter === 'active' && !member.disabled && !guest) ||
        (memberFilter === 'disabled' && Boolean(member.disabled)) ||
        (memberFilter === 'guests' && guest);
      return matchesSearch && matchesFilter;
    }) ?? [];

  const pageTitle =
    activeView === 'Scout'
      ? currentMatch
        ? `${matchHeaderLabel(currentMatch)}${selectedStation ? ` · ${selectedStation.replace('red', 'Red ').replace('blue', 'Blue ')}` : ''}${selectedTeam ? ` · Team ${selectedTeam}` : ''}`
        : 'Choose an assignment'
      : activeView === 'Pit'
        ? 'Pit Scouting'
        : activeView === 'Plan' && currentMatch
          ? `Plan · ${matchHeaderLabel(currentMatch)}`
          : activeView;

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('team401-theme', next ? 'dark' : 'light');
    setDark(next);
  }

  if (isPending || !session) return null;

  return (
    <main className="app-shell">
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
          aria-current={activeView === 'Account' ? 'page' : undefined}
          onClick={() => navigate('Account')}
          className={
            activeView === 'Account'
              ? 'nav-item active mt-auto'
              : 'nav-item mt-auto'
          }
        >
          <CircleUserRound />
          <span>Account</span>
        </button>
      </aside>
      <section className="app-content h-dvh min-w-0 flex-1 overflow-y-auto">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-2">
            <div className="mobile-brand-mark" aria-hidden="true">401</div>
            <h1 className={activeView === 'Scout' ? 'scout-heading' : undefined}>
              {pageTitle}
            </h1>
          </div>
          <div className="desktop-header-actions flex items-center gap-2">
            <Badge variant="outline" className="status-badge">
              {online ? <Cloud /> : <CloudOff />}
              <span className="status-text">
                {online ? 'Online' : 'Offline ready'}
              </span>
            </Badge>
            {!isPending &&
              (session ? (
                <Button
                  variant="outline"
                  onClick={() => navigate('Account')}
                >
                  <CircleUserRound />
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
              onClick={toggleTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
          <Button
            type="button"
            className="mobile-header-menu-button"
            size="icon"
            variant="ghost"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <Menu />
          </Button>
        </header>
        {activeView === 'Home' && (
          <div className="mx-auto grid w-full max-w-3xl gap-4 p-4 sm:p-6">
            <Card>
              <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {eventPack?.event.name ?? 'No current event selected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventPack?.event.updatedAt
                      ? `Updated ${new Date(eventPack.event.updatedAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`
                      : isAdmin
                        ? 'Choose an event from Admin.'
                        : 'A scouting administrator needs to choose an event.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!online || packLoading}
                  onClick={() => void loadEventPack(false, true)}
                >
                  <RefreshCw className={packLoading ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>My scouting schedule</CardTitle>
                <Badge variant="outline">
                  {myAssignments.length} match
                  {myAssignments.length === 1 ? '' : 'es'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {eventPack?.scoutShifts.map((shift) => (
                  <div className="schedule-row" key={shift.id}>
                    <strong>{shift.station.toUpperCase()}</strong>
                    <span>
                      {new Date(shift.startsAt).toLocaleString([], {
                        weekday: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {new Date(shift.endsAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {myAssignments.map(({ assignment, match }, index) =>
                  match ? (
                    <Button
                      key={`${match.id}:${assignment.station}`}
                      className="w-full"
                      variant={index === 0 ? 'default' : 'outline'}
                      onClick={() =>
                        selectAssignment(
                          match,
                          assignment.teamNumber,
                          assignment.station,
                        )
                      }
                    >
                      <span className="flex-1 text-left">
                        {matchLabel(match)} · Team {assignment.teamNumber} ·{' '}
                        {assignment.station.toUpperCase()}
                      </span>
                      <span>
                        {match.predictedAt || match.scheduledAt
                          ? new Date(
                              match.predictedAt ?? match.scheduledAt!,
                            ).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'TBD'}
                      </span>
                    </Button>
                  ) : null,
                )}
                {!eventPack?.scoutShifts.length &&
                  myAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No scouting shifts or matches are assigned to you yet.
                  </p>
                  )}
              </CardContent>
            </Card>
            {reopenedEntries.length > 0 && (
              <Card className="border-amber-400">
                <CardHeader>
                  <CardTitle>Corrections requested</CardTitle>
                  <Badge variant="destructive">{reopenedEntries.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reopenedEntries.map((entry) => {
                    const match = eventPack?.matches.find(
                      (item) => item.id === entry.matchId,
                    );
                    return match ? (
                      <Button
                        className="w-full justify-between"
                        variant="outline"
                        key={`${entry.matchId}:${entry.teamNumber}`}
                        onClick={() =>
                          selectAssignment(
                            match,
                            entry.teamNumber,
                            entry.station,
                          )
                        }
                      >
                        Correct {matchLabel(match)} · Team {entry.teamNumber}
                        <ChevronRight />
                      </Button>
                    ) : null;
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {activeView === 'Scout' && (
          <div
            className={
              videoReview
                ? 'mx-auto grid w-full max-w-7xl items-start gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,.95fr)]'
                : 'mx-auto w-full max-w-3xl p-4 sm:p-6'
            }
          >
            {videoReview && (
              <Card className="sticky top-0 z-20 overflow-hidden lg:top-4">
                <CardHeader>
                  <CardTitle>
                    Video review · {currentMatch && matchLabel(currentMatch)}
                  </CardTitle>
                  <Badge variant="outline">Team {selectedTeam}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentMatch && currentMatchYoutubeVideo ? (
                    <iframe
                      className="aspect-video w-full rounded-lg bg-black"
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                        currentMatchYoutubeVideo.key,
                      )}`}
                      title={`${matchLabel(currentMatch)} match video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <MatchVideoLibrary
                      matchId={currentMatch?.id ?? null}
                      matchLabel={
                        currentMatch ? matchLabel(currentMatch) : 'this match'
                      }
                      playbackOnly
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Play, pause, and scrub the match while completing the normal
                    scouting form. This submission will be marked as recovered
                    from video.
                  </p>
                </CardContent>
              </Card>
            )}
            <div className="scout-form min-w-0 space-y-4">
              <Card>
                <CardContent className="scout-assignment-selectors grid gap-3 p-4 sm:grid-cols-2">
                  <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium">
                    <span>Match</span>
                    <select
                      className="h-10 min-w-0 rounded-md border bg-background px-3 text-foreground"
                      value={selectedMatchKey}
                      onChange={(event) => {
                        const match = eventPack?.matches.find(
                          (item) => item.key === event.target.value,
                        );
                        if (!match) return;
                        const station = selectedStation || 'red1';
                        const alliance = station.startsWith('blue')
                          ? match.alliances.blue
                          : match.alliances.red;
                        const stationIndex = Number(station.at(-1)) - 1;
                        const team = alliance[stationIndex];
                        if (team) selectAssignment(match, team, station);
                      }}
                    >
                      {eventPack?.matches.map((match) => (
                        <option value={match.key} key={match.key}>
                          {matchLabel(match)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-sm font-medium">
                    <span>Station</span>
                    <select
                      className="h-10 min-w-0 rounded-md border bg-background px-3 text-foreground"
                      value={selectedStation}
                      onChange={(event) => {
                        if (!currentMatch) return;
                        const station = event.target.value;
                        const alliance = station.startsWith('red')
                          ? currentMatch.alliances.red
                          : currentMatch.alliances.blue;
                        const index = Number(station.at(-1)) - 1;
                        const team = alliance[index];
                        if (team)
                          selectAssignment(currentMatch, team, station);
                      }}
                    >
                      {currentMatch &&
                        [
                          ...currentMatch.alliances.red.map((team, index) => ({
                            team,
                            station: `red${index + 1}`,
                          })),
                          ...currentMatch.alliances.blue.map((team, index) => ({
                            team,
                            station: `blue${index + 1}`,
                          })),
                        ].map(({ team, station }) => (
                          <option value={station} key={station}>
                            {station.toUpperCase()} · Team {team}
                          </option>
                        ))}
                    </select>
                  </label>
                </CardContent>
              </Card>
              <div className="grid grid-cols-4 gap-1 rounded-xl border bg-card p-1">
                {([
                  ['pre', 'Pre-match'],
                  ['auto', 'Auto'],
                  ['tele', 'Teleop'],
                  ['post', 'Post-match'],
                ] as const).map(([phase, label]) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={scoutingPhase === phase ? 'default' : 'ghost'}
                    aria-current={scoutingPhase === phase ? 'step' : undefined}
                    disabled={noShow && (phase === 'auto' || phase === 'tele')}
                    onClick={() => moveToScoutingPhase(phase)}
                    className="min-w-0 px-1 text-xs sm:text-sm"
                    key={phase}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {scoutingPhase === 'pre' && (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Pre-match</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <div>
                        <strong>Starting position</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {[
                          'Left trench',
                          'Left bump',
                          'Center',
                          'Right bump',
                          'Right trench',
                        ].map((position) => (
                          <button
                            type="button"
                            className={
                              autoStartPosition === position
                                ? 'choice selected min-h-12 px-2 text-center text-sm'
                                : 'choice min-h-12 px-2 text-center text-sm'
                            }
                            aria-pressed={autoStartPosition === position}
                            onClick={() => setAutoStartPosition(position)}
                            key={position}
                          >
                            {position}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={noShow ? 'choice selected w-full' : 'choice w-full'}
                      onClick={() => {
                        const nextNoShow = !noShow;
                        setNoShow(nextNoShow);
                        setSaveError('');
                        if (nextNoShow) setScoutingPhase('post');
                      }}
                    >
                      {noShow && <Check />} No-show
                    </button>
                  </CardContent>
                </Card>
              )}

              {scoutingPhase === 'auto' && (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Autonomous</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border p-0">
                    <Counter
                      label="Fuel scored"
                      value={autoFuel}
                      onChange={setAutoFuel}
                      quickAdds={[5]}
                    />
                    <Counter
                      label="Center swipes"
                      value={centerSwipes}
                      onChange={setCenterSwipes}
                    />
                    <div className="grid grid-cols-2 gap-2 px-4 py-3">
                      <button
                        type="button"
                        className={autoDepot ? 'choice selected' : 'choice'}
                        aria-pressed={autoDepot}
                        onClick={() => setAutoDepot(!autoDepot)}
                      >
                        {autoDepot && <Check />} Depot
                      </button>
                      <button
                        type="button"
                        className={autoOutpost ? 'choice selected' : 'choice'}
                        aria-pressed={autoOutpost}
                        onClick={() => setAutoOutpost(!autoOutpost)}
                      >
                        {autoOutpost && <Check />} Outpost
                      </button>
                    </div>
                    <Counter
                      label="Penalties"
                      value={autoPenalties}
                      onChange={setAutoPenalties}
                    />
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <strong>Auto tower</strong>
                      <div className="two-choices">
                        {['None', 'Level 1'].map((item) => (
                          <button
                            type="button"
                            onClick={() => setAutoTower(item)}
                            key={item}
                            className={
                              autoTower === item
                                ? 'choice selected h-9 min-h-0 px-3 text-sm'
                                : 'choice h-9 min-h-0 px-3 text-sm'
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
              )}

              {scoutingPhase === 'tele' && (
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle>Teleoperated</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-border p-0">
                    <Counter
                      label="Fuel scored"
                      value={activeFuel}
                      onChange={setActiveFuel}
                      quickAdds={[5, 10]}
                    />
                    <Counter
                      label="Fuel passed"
                      value={passedFuel}
                      onChange={setPassedFuel}
                      quickAdds={[5]}
                    />
                    <Counter
                      label="Penalties"
                      value={teleopPenalties}
                      onChange={setTeleopPenalties}
                    />
                  </CardContent>
                </Card>
              )}

              {scoutingPhase === 'post' && <>
              {noShow ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No-show report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>This report will submit with match observations set to zero.</p>
                  </CardContent>
                </Card>
              ) : <>
              <Card>
                <CardHeader>
                  <CardTitle>Field movement</CardTitle>
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
                    <CardTitle>Played defense</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      { value: null, label: 'N/A' },
                      { value: 1, label: 'Ineffective' },
                      { value: 2, label: 'Some impact' },
                      { value: 3, label: 'Effective' },
                      { value: 4, label: 'Dominant' },
                    ].map(({ value, label }) => (
                      <button
                        type="button"
                        onClick={() => setDefenseRating(value)}
                        aria-pressed={defenseRating === value}
                        className={
                          defenseRating === value
                            ? 'choice selected min-h-16 flex-col gap-1 px-2 text-center text-sm'
                            : 'choice min-h-16 flex-col gap-1 px-2 text-center text-sm'
                        }
                        key={label}
                      >
                        <strong className="text-lg">{value}</strong>
                        <span>{label}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
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
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Endgame tower</CardTitle>
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
                  <div>
                      <p className="mb-2 font-semibold">Robot reliability</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: false, label: 'Working' },
                          { value: true, label: 'Disabled or broken' },
                        ].map((item) => (
                          <button
                            type="button"
                            className={
                              disabled === item.value
                                ? 'choice selected'
                                : 'choice'
                            }
                            aria-pressed={disabled === item.value}
                            onClick={() => setDisabled(item.value)}
                            key={item.label}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
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
              </>}
              </>}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={scoutingPhase === 'pre'}
                  onClick={() =>
                    moveToScoutingPhase(
                      scoutingPhase === 'post'
                        ? noShow
                          ? 'pre'
                          : 'tele'
                        : scoutingPhase === 'tele'
                          ? 'auto'
                          : 'pre',
                    )}
                >
                  Previous
                </Button>
                {scoutingPhase !== 'post' ? (
                  <Button
                    type="button"
                    onClick={() =>
                      moveToScoutingPhase(
                        scoutingPhase === 'pre'
                          ? 'auto'
                          : scoutingPhase === 'auto'
                            ? 'tele'
                            : 'post',
                      )
                    }
                  >
                    Next <ChevronRight />
                  </Button>
                ) : (
                  <span />
                )}
              </div>
              {saveError && (
                <p role="alert" className="auth-error">
                  {saveError}
                </p>
              )}
              {scoutingPhase === 'post' && <Button
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
                    {online ? 'Submit match' : 'Save match offline'}{' '}
                    <ChevronRight />
                  </>
                ) : (
                  <>Opening offline storage…</>
                )}
              </Button>}
              {(submissionStatus === 'queued' ||
                submissionStatus === 'synchronized') && (
                <>
                  {submittedMatchMutation && eventPack && (
                    <MatchSubmissionQr
                      mutation={submittedMatchMutation}
                      organizationId={eventPack.organizationId}
                      eventKey={eventPack.event.key}
                      online={online}
                    />
                  )}
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
                </>
              )}
            </div>
          </div>
        )}
        {activeView === 'Pit' && (
          <div className="pit-layout grid gap-4 p-4 sm:p-6 lg:grid-cols-[18rem_1fr]">
            <Card className="pit-mobile-picker">
              <CardContent className="p-3">
                <label className="grid gap-1 text-sm font-semibold">
                  Team to pit scout
                  <select
                    className="h-11 w-full rounded-md border bg-background px-3 text-foreground"
                    value={pitTeam ?? ''}
                    onChange={(event) =>
                      setPitTeam(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">Choose a team</option>
                    {eventTeams.map((team) => {
                      const entry = eventPack?.pitEntries.find(
                        (entry) => entry.teamNumber === team,
                      );
                      return (
                        <option value={team} key={team}>
                          Team {team}
                          {eventPack?.teams.find((item) => item.teamNumber === team)?.name
                            ? ` — ${eventPack.teams.find((item) => item.teamNumber === team)?.name}`
                            : ''}
                          {' — '}{entry ? `Scouted by ${entry.scoutName}` : 'Needs scouting'}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {pitTeam && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Team {pitTeam} selected · changes save on this device
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="pit-queue-card h-full min-h-0">
              <CardHeader>
                <CardTitle>Pit queue</CardTitle>
                <Badge variant="outline">
                  {eventPack?.pitEntries.length ?? 0}/{eventTeams.length}{' '}
                  complete
                </Badge>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-1 overflow-auto">
                {eventTeams.map((team) => {
                  const entry = eventPack?.pitEntries.find(
                    (entry) => entry.teamNumber === team,
                  );
                  const complete = Boolean(entry);
                  return (
                    <button
                      type="button"
                      className={`schedule-row pit-queue-row ${
                        complete ? 'pit-queue-complete' : 'pit-queue-needed'
                      } ${pitTeam === team ? 'selected' : ''} w-full text-left`}
                      onClick={() => setPitTeam(team)}
                      key={team}
                    >
                      <strong>
                        Team {team}
                        {eventPack?.teams.find((item) => item.teamNumber === team)?.name
                          ? ` — ${eventPack.teams.find((item) => item.teamNumber === team)?.name}`
                          : ''}
                      </strong>
                      <span className="pit-queue-status">
                        {entry
                          ? `Scouted by ${entry.scoutName} · ${new Date(entry.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                          : 'Needs scouting'}
                      </span>
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
                  {pitTeam
                    ? `Team ${pitTeam}${eventPack?.teams.find((item) => item.teamNumber === pitTeam)?.name ? ` — ${eventPack.teams.find((item) => item.teamNumber === pitTeam)?.name}` : ''} robot`
                    : 'Choose a team'}
                </CardTitle>
                {pitTeam && <Badge variant="outline">Auto-saved offline</Badge>}
                {pitTeam && eventPack?.pitEntries.find((entry) => entry.teamNumber === pitTeam) && (
                  <p className="text-sm text-muted-foreground">
                    Scouted by{' '}
                    {eventPack.pitEntries.find((entry) => entry.teamNumber === pitTeam)?.scoutName}{' '}
                    ·{' '}
                    {new Date(
                      eventPack.pitEntries.find((entry) => entry.teamNumber === pitTeam)!.updatedAt,
                    ).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                )}
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
                          min="1"
                          inputMode="decimal"
                          required
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
                      <label className="grid gap-1 text-sm">
                        Shooter mounting
                        <select
                          className="h-10 rounded-md border bg-transparent px-3"
                          value={pitDraft.shooterMount}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              shooterMount: event.target.value,
                            })
                          }
                        >
                          <option>Fixed</option>
                          <option>Turreted</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm">
                        Shooter barrels
                        <select
                          className="h-10 rounded-md border bg-transparent px-3"
                          value={pitDraft.shooterBarrels}
                          onChange={(event) =>
                            setPitDraft({
                              ...pitDraft,
                              shooterBarrels: event.target.value,
                            })
                          }
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="Drum">Drum</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className={
                          pitDraft.adjustableHood
                            ? 'choice selected self-end'
                            : 'choice self-end'
                        }
                        onClick={() =>
                          setPitDraft({
                            ...pitDraft,
                            adjustableHood: !pitDraft.adjustableHood,
                          })
                        }
                      >
                        {pitDraft.adjustableHood && <Check />}
                        Adjustable hood
                      </button>
                    </div>
                    <div className="space-y-3 rounded-lg border p-3">
                      <div>
                        <p className="mb-2 font-semibold">Field access</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {['Trench', 'Bump', 'Both'].map((item) => (
                            <button
                              type="button"
                              className={
                                pitDraft.fieldAccess === item
                                  ? 'choice selected'
                                  : 'choice'
                              }
                              onClick={() =>
                                setPitDraft({ ...pitDraft, fieldAccess: item })
                              }
                              key={item}
                            >
                              {pitDraft.fieldAccess === item && <Check />}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">Preferred route</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {['Trench', 'Bump', 'No preference'].map((item) => (
                            <button
                              type="button"
                              className={
                                pitDraft.fieldAccessPreference === item
                                  ? 'choice selected'
                                  : 'choice'
                              }
                              onClick={() =>
                                setPitDraft({
                                  ...pitDraft,
                                  fieldAccessPreference: item,
                                })
                              }
                              key={item}
                            >
                              {pitDraft.fieldAccessPreference === item && (
                                <Check />
                              )}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-lg border p-3">
                      <div>
                        <p className="font-semibold">Autonomous capabilities</p>
                        <p className="text-xs text-muted-foreground">
                          Select every routine the robot can run.
                        </p>
                      </div>
                      <div>
                        <p className="text-sm">Starting positions</p>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Select every position the robot has an autonomous
                          routine for. Left and right are viewed from the driver
                          station.
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {[
                            'Left trench',
                            'Left bump',
                            'Center',
                            'Right bump',
                            'Right trench',
                            'Unknown',
                          ].map((item) => (
                            <button
                              type="button"
                              className={
                                pitDraft.autonomousStart.includes(item)
                                  ? 'choice selected'
                                  : 'choice'
                              }
                              onClick={() =>
                                setPitDraft({
                                  ...pitDraft,
                                  autonomousStart: toggleSelection(
                                    pitDraft.autonomousStart,
                                    item,
                                    'Unknown',
                                  ),
                                })
                              }
                              key={item}
                            >
                              {pitDraft.autonomousStart.includes(item) && (
                                <Check />
                              )}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-sm">Swipe routine</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {['None', 'Single swipe', 'Double swipe'].map(
                            (item) => (
                              <button
                                type="button"
                                className={
                                  pitDraft.autonomousSwipe.includes(item)
                                    ? 'choice selected'
                                    : 'choice'
                                }
                                onClick={() =>
                                  setPitDraft({
                                    ...pitDraft,
                                    autonomousSwipe: toggleSelection(
                                      pitDraft.autonomousSwipe,
                                      item,
                                      'None',
                                    ),
                                  })
                                }
                                key={item}
                              >
                                {pitDraft.autonomousSwipe.includes(item) && (
                                  <Check />
                                )}
                                {item}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={
                          pitDraft.autonomousDepot
                            ? 'choice selected w-full'
                            : 'choice w-full'
                        }
                        onClick={() =>
                          setPitDraft({
                            ...pitDraft,
                            autonomousDepot: !pitDraft.autonomousDepot,
                          })
                        }
                      >
                        {pitDraft.autonomousDepot && <Check />}
                        Uses depot in autonomous
                      </button>
                      <textarea
                        aria-label="Additional autonomous notes"
                        className="min-h-20 w-full rounded-md border bg-transparent p-3"
                        value={pitDraft.autonomousNotes}
                        onChange={(event) =>
                          setPitDraft({
                            ...pitDraft,
                            autonomousNotes: event.target.value,
                          })
                        }
                        placeholder="Additional autonomous notes…"
                      />
                    </div>
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
                    <div className="space-y-3 rounded-lg border p-3">
                      <p className="font-semibold">Robot photo</p>
                      {existingPitPhoto && (
                        <img
                          className="aspect-video w-full max-w-md rounded-md object-cover"
                          src={`/api/pit-photo?team=${pitTeam}&v=${photoVersion}`}
                          alt={`Team ${pitTeam} robot`}
                        />
                      )}
                      <p className="text-sm text-muted-foreground">
                        Take or choose a JPEG, PNG, or WebP image up to 10 MB.
                        Photo upload requires a connection.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
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
                    </div>
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
        {activeView === 'Plan' && (
          <div className="p-2 sm:p-4">
            <Card>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <label className="shrink-0 font-semibold" htmlFor="plan-match">
                    Match
                  </label>
                <select
                  id="plan-match"
                  aria-label="Match to plan"
                  className="h-11 min-w-0 flex-1 rounded-md border bg-transparent px-3"
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
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={planSection === 'auto' ? 'default' : 'ghost'}
                    onClick={() => setPlanSection('auto')}
                  >
                    Auto Plan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={planSection === 'teleop' ? 'default' : 'ghost'}
                    onClick={() => setPlanSection('teleop')}
                  >
                    Tele Plan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={planSection === 'metrics' ? 'default' : 'ghost'}
                    onClick={() => setPlanSection('metrics')}
                  >
                    Team metrics
                  </Button>
                </div>
                {eventPack && planningMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Team {organizationTeamNumber} is not scheduled for any
                    matches in this event pack.
                  </p>
                )}
                {planSection !== 'metrics' && <>
                <div className="border-t pt-4">
                  <TacticalBoard
                    value={
                      planSection === 'auto'
                        ? matchPlan.autoBoard
                        : matchPlan.board
                    }
                    readOnly={!planCanEdit}
                    onChange={(board) =>
                      setMatchPlan(
                        planSection === 'auto'
                          ? { ...matchPlan, autoBoard: board }
                          : { ...matchPlan, board },
                      )
                    }
                  />
                </div>
                <div className="space-y-3 border-t pt-4">
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
                  {(planMessage || planAuthor || planCanEdit) && (
                    <p className="text-sm text-muted-foreground" role="status">
                      {planMessage ||
                        (planAuthor && planUpdatedAt
                          ? `Saved automatically by ${planAuthor} · ${new Date(planUpdatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                          : 'Changes save automatically.')}
                    </p>
                  )}
                </div>
                </>}
                {planSection === 'metrics' && (
                <div className="grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-3">
                  {planTeams.map(({ team, alliance, stats, pit, name }) => (
                    <div
                      className={
                        alliance === 'red'
                          ? 'rounded-lg border border-l-8 border-red-500 bg-red-50 p-3 text-red-950 dark:bg-red-950/30 dark:text-red-50'
                          : 'rounded-lg border border-l-8 border-blue-500 bg-blue-50 p-3 text-blue-950 dark:bg-blue-950/30 dark:text-blue-50'
                      }
                      key={team}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>
                            Team {team}
                            {name ? ` - ${name}` : ''}
                          </strong>
                          {matchPlan.absentTeams.includes(team) && (
                            <Badge className="ml-2" variant="destructive">
                              Not playing
                            </Badge>
                          )}
                        </div>
                        <span
                          aria-label={`${alliance} alliance`}
                          className={
                            alliance === 'red'
                              ? 'size-4 rounded-full bg-red-600 ring-2 ring-red-200'
                              : 'size-4 rounded-full bg-blue-600 ring-2 ring-blue-200'
                          }
                        />
                      </div>
                      {planCanEdit && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            const isAbsent = matchPlan.absentTeams.includes(team);
                            const absentTeams = isAbsent
                              ? matchPlan.absentTeams.filter(
                                  (item) => item !== team,
                                )
                              : [...matchPlan.absentTeams, team];
                            const defaultMarkers = initialRobotMarkers(
                              currentMatch?.alliances.red ?? [],
                              currentMatch?.alliances.blue ?? [],
                            );
                            const robots = isAbsent
                              ? [
                                  ...matchPlan.board.robots,
                                  ...defaultMarkers.filter((robot) => robot.team === team),
                                ]
                              : matchPlan.board.robots.filter(
                                  (robot) => robot.team !== team,
                                );
                            const autoRobots = isAbsent
                              ? [
                                  ...matchPlan.autoBoard.robots,
                                  ...defaultMarkers.filter((robot) => robot.team === team),
                                ]
                              : matchPlan.autoBoard.robots.filter(
                                  (robot) => robot.team !== team,
                                );
                            setMatchPlan({
                              ...matchPlan,
                              absentTeams,
                              board: { ...matchPlan.board, robots },
                              autoBoard: { ...matchPlan.autoBoard, robots: autoRobots },
                            });
                          }}
                        >
                          {matchPlan.absentTeams.includes(team)
                            ? 'Return robot to field'
                            : 'Robot not playing'}
                        </Button>
                      )}
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
                            {Math.round((stats?.disabledRate ?? 0) * 100)}%
                          </strong>
                          <small className="block text-muted-foreground">
                            disabled
                          </small>
                        </span>
                      </div>
                      <div className="mt-3 border-t pt-2 text-xs">
                        <p className="font-semibold">Pit summary</p>
                        {pit ? (
                          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                            <span>
                              {pit.drivetrain ?? 'Unknown'}
                              {pit.swerveModule
                                ? ` · ${pit.swerveModule}`
                                : ''}
                            </span>
                            <span>
                              {pit.weightLbs ? `${pit.weightLbs} lb` : 'Weight —'}
                            </span>
                            <span>
                              Capacity {pit.payload.fuelCapacity ?? '—'}
                            </span>
                            <span>
                              Climb {pit.payload.climbCapability ?? '—'}
                            </span>
                            <span>
                              Access {pit.payload.fieldAccess ?? '—'}
                            </span>
                            <span>
                              Shooter{' '}
                              {shooterSummary(pit.payload)}
                            </span>
                            <span className="col-span-2 line-clamp-2">
                              Auto:{' '}
                              {[
                                normalizeSelections(
                                  pit.payload.autonomousStart,
                                  'Unknown',
                                ).join(', '),
                                normalizeSelections(
                                  pit.payload.autonomousSwipe,
                                  'None',
                                )
                                  .filter((item) => item !== 'None')
                                  .join(', ') || null,
                                pit.payload.autonomousDepot ? 'Depot' : null,
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </span>
                          </div>
                        ) : (
                          <p className="mt-1 text-muted-foreground">
                            No pit report
                          </p>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {stats?.samples ?? 0} scouting samples ·{' '}
                        {Math.round((stats?.coverage ?? 0) * 100)}% coverage
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full bg-background/70"
                        onClick={() => {
                          setSelectedTeam(team);
                          setTeamsSection('analysis');
                          navigate('Data');
                        }}
                      >
                        View team {team}
                        <ChevronRight />
                      </Button>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Admin' && isAdmin && (
          <div className="section-tabs flex gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
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
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={assignmentMode === 'time' ? 'default' : 'outline'}
                  onClick={() => setAssignmentMode('time')}
                >
                  <CalendarDays /> Time blocks
                </Button>
                <Button
                  type="button"
                  variant={assignmentMode === 'match' ? 'default' : 'outline'}
                  onClick={() => setAssignmentMode('match')}
                >
                  Individual matches
                </Button>
              </div>
              <Card className="mb-4">
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
                    onClick={() => setScheduleFilter('unassigned')}
                  >
                    Review unassigned matches
                  </Button>
                </CardContent>
              </Card>
              {assignmentMode === 'time' && (
                <ShiftScheduler
                  members={eventPack?.members ?? []}
                  matches={(eventPack?.matches ?? []).map((match) => ({
                    key: match.key,
                    label: matchLabel(match),
                    scheduledAt: match.scheduledAt,
                    predictedAt: match.predictedAt,
                  }))}
                  onChanged={() => loadEventPack(false, true)}
                />
              )}
              <ScoutingOperations mode="coverage" />
              {assignmentMode === 'match' && (
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
              )}
            </div>
          )}
        {activeView === 'Data' && (
          <div className="section-tabs flex gap-2 px-4 pt-4 sm:px-6 sm:pt-6">
            {(
              [
                ['analysis', 'Analysis'],
                ...(canUsePickLists
                  ? ([['picklist', 'Pick lists']] as const)
                  : []),
                ...(canUseStrategy
                  ? ([['review', 'Scouting review']] as const)
                  : []),
              ] as const
            ).map(([section, label]) => (
              <Button
                key={section}
                size="sm"
                variant={teamsSection === section ? 'default' : 'outline'}
                onClick={() => setTeamsSection(section)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        {activeView === 'Data' &&
          canUsePickLists &&
          teamsSection === 'picklist' && (
            <div className="p-4 sm:p-6">
              {eventPack && (
                <PickListWorkspace
                  teams={strategyTeams}
                  eventKey={eventPack.event.key}
                  organizationTeamNumber={organizationTeamNumber}
                  userId={eventPack.userId}
                  initialMode="personal"
                />
              )}
            </div>
          )}
        {activeView === 'Data' &&
          canUseStrategy &&
          teamsSection === 'review' && (
            <div className="grid gap-4 p-4 sm:p-6">
              <ScoutingOperations
                mode="review"
                onVideoReview={startVideoReview}
              />
            </div>
          )}
        {activeView === 'Video' && (
          <div className="mx-auto grid w-full max-w-5xl gap-4 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Choose a match</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  aria-label="Match video to record, upload, or review"
                  className="h-11 w-full rounded-md border bg-background px-3 text-foreground"
                  value={selectedVideoMatchKey}
                  disabled={videoMatches.length === 0}
                  onChange={(event) =>
                    setSelectedVideoMatchKey(event.target.value)
                  }
                >
                  {videoMatches.map((match) => (
                    <option value={match.key} key={match.key}>
                      {matchLabel(match)} · {match.alliances.red.join(', ')} vs{' '}
                      {match.alliances.blue.join(', ')}
                    </option>
                  ))}
                </select>
                {eventPack && videoMatches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Team {organizationTeamNumber} is not scheduled for this
                    event.
                  </p>
                )}
              </CardContent>
            </Card>
            <MatchVideoLibrary
              matchId={selectedVideoMatch?.id ?? null}
              matchLabel={
                selectedVideoMatch ? matchLabel(selectedVideoMatch) : 'this match'
              }
              externalVideos={selectedVideoMatch?.videos ?? []}
            />
          </div>
        )}
        {activeView === 'Alliance' && canUseStrategy && (
          <div className="p-2 sm:p-4">
            {eventPack && (
              <PickListWorkspace
                teams={strategyTeams}
                eventKey={eventPack.event.key}
                organizationTeamNumber={organizationTeamNumber}
                userId={eventPack.userId}
                initialMode="selection"
              />
            )}
          </div>
        )}
        {activeView === 'Data' &&
          teamsSection === 'analysis' && (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <TeamComparison
                teams={strategyTeams}
                matches={(eventPack?.matches ?? []).map((match) => ({
                  key: match.key,
                  label: matchLabel(match),
                  red: match.alliances.red,
                  blue: match.alliances.blue,
                }))}
              />
              <Card className="sm:col-span-2">
                <CardHeader>
                  <CardTitle>Event ranking workspace</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {strategyTeams.length} teams
                    </Badge>
                    <Button
                      size="sm"
                      variant={rankingSort === 'rank' ? 'default' : 'outline'}
                      onClick={() => setRankingSort('rank')}
                    >
                      Event rank
                    </Button>
                    <Button
                      size="sm"
                      variant={rankingSort === 'team' ? 'default' : 'outline'}
                      onClick={() => setRankingSort('team')}
                    >
                      Team number
                    </Button>
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
                    <strong>Rank</strong>
                    <strong>Team</strong>
                    <strong>Samples</strong>
                    <strong>Median pts</strong>
                    <strong>Coverage</strong>
                    {[...strategyTeams]
                      .sort((a, b) => {
                        if (rankingSort === 'team')
                          return a.teamNumber - b.teamNumber;
                        if (a.eventRank === null) return 1;
                        if (b.eventRank === null) return -1;
                        return a.eventRank - b.eventRank;
                      })
                      .map((team) => (
                        <button
                          key={team.teamNumber}
                          onClick={() => setSelectedTeam(team.teamNumber)}
                          className={
                            selectedTeam === team.teamNumber ? 'selected' : ''
                          }
                        >
                          <span>{team.eventRank ?? '—'}</span>
                          <span>
                            {team.teamNumber}
                            {eventPack?.teams.find(
                              (item) => item.teamNumber === team.teamNumber,
                            )?.name
                              ? ` — ${eventPack.teams.find((item) => item.teamNumber === team.teamNumber)?.name}`
                              : ''}
                          </span>
                          <span>{team.samples}</span>
                          <span>{team.medianPoints.toFixed(1)}</span>
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
                      ? `Team ${selectedTeam}${eventPack?.teams.find((item) => item.teamNumber === selectedTeam)?.name ? ` — ${eventPack.teams.find((item) => item.teamNumber === selectedTeam)?.name}` : ''} summary`
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
                        {analysis?.pointStdDev.toFixed(1) ?? '0.0'}
                      </strong>{' '}
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
                  <CardTitle>TBA and external ratings</CardTitle>
                </CardHeader>
                <CardContent className="mini-stats">
                  <span>
                    <strong>{selectedStrategyTeam?.eventRank ?? '—'}</strong>{' '}
                    event rank
                  </span>
                  <span>
                    <strong>
                      {selectedStrategyTeam
                        ? `${selectedStrategyTeam.wins}-${selectedStrategyTeam.losses}-${selectedStrategyTeam.ties}`
                        : '—'}
                    </strong>{' '}
                    TBA record
                  </span>
                  <span>
                    <strong>
                      {selectedStrategyTeam?.opr?.toFixed(1) ?? '—'}
                    </strong>{' '}
                    TBA OPR
                  </span>
                  <span>
                    <strong>
                      {selectedStrategyTeam?.epa?.toFixed(1) ?? '—'}
                    </strong>{' '}
                    Statbotics EPA
                  </span>
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
                  <CardTitle>Pit scouting</CardTitle>
                </CardHeader>
                <CardContent>
                  {analysis?.pit ? (
                    <div className="mini-stats">
                      <span>
                        <strong>{analysis.pit.drivetrain ?? 'Unknown'}</strong>{' '}
                        drivetrain
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.weightLbs
                            ? `${analysis.pit.weightLbs} lb`
                            : 'Unknown'}
                        </strong>{' '}
                        robot weight
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.payload.shooterMount ?? 'Unknown'}
                        </strong>{' '}
                        shooter mount
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.payload.shooterBarrels ?? 'Unknown'}
                        </strong>{' '}
                        shooter barrels
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.payload.fieldAccess ?? 'Unknown'}
                        </strong>{' '}
                        field access
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.payload.climbCapability ?? 'Unknown'}
                        </strong>{' '}
                        climb capability
                      </span>
                      <span>
                        <strong>
                          {displaySelections(
                            analysis.pit.payload.autonomousStart,
                          )}
                        </strong>{' '}
                        autonomous starts
                      </span>
                      <span>
                        <strong>
                          {analysis.pit.payload.adjustableHood ? 'Yes' : 'No'}
                        </strong>{' '}
                        adjustable hood
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No pit report has been submitted for this team.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="sm:col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedTeam
                      ? `Team ${selectedTeam} trends`
                      : 'Team trends'}
                  </CardTitle>
                  <Badge variant="outline">Match by match</Badge>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Match-by-match observed points, autonomous FUEL,
                    teleoperated FUEL, and defense rating (0–4).
                  </p>
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
                <CardTitle>Current event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose one of Team 401&apos;s registered events from The Blue
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
            <GuestPassManager />
            <Card>
              <CardHeader>
                <CardTitle>Team members and roles</CardTitle>
                <Badge variant="outline">
                  {eventPack?.members.length ?? 0} accounts
                </Badge>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="pb-3 text-sm text-muted-foreground">
                  Accounts and passwords come from Team 401 Ops. Scouting roles
                  and scouting access are managed here. A successful Team 401
                  sign-in syncs the full Ops roster, including users who have
                  never signed in themselves.
                </p>
                <div className="grid gap-2 pb-3 sm:grid-cols-[1fr_10rem]">
                  <Input
                    value={memberSearch}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search name or email"
                    aria-label="Search team members"
                  />
                  <select
                    className="h-8 rounded-lg border bg-background px-2.5 text-sm"
                    value={memberFilter}
                    onChange={(event) =>
                      setMemberFilter(
                        event.target.value as typeof memberFilter,
                      )
                    }
                    aria-label="Filter team members"
                  >
                    <option value="active">Active members</option>
                    <option value="disabled">Disabled</option>
                    <option value="guests">Guests</option>
                    <option value="all">All accounts</option>
                  </select>
                </div>
                {filteredMembers.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div>
                      <strong>{member.name}</strong>
                      <small>
                        {member.email.endsWith('@guest.invalid')
                          ? 'Temporary partner access'
                          : member.email}
                      </small>
                      {Boolean(member.disabled) && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </div>
                    {member.email.endsWith('@guest.invalid') ? (
                      <Badge variant="outline">Guest scout</Badge>
                    ) : member.role === 'owner' ? (
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
                            void setMemberDisabled(member.id, !member.disabled)
                          }
                        >
                          {member.disabled ? 'Enable' : 'Disable'}
                        </Button>
                        {Boolean(member.disabled) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void removeMember(member.id, member.name)
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {!filteredMembers.length && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No accounts match this search and filter.
                  </p>
                )}
                {adminMessage && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {adminMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        {activeView === 'Account' && (
          <div className="grid gap-4 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid max-w-lg gap-3" onSubmit={changePassword}>
                  <p className="text-sm text-muted-foreground">
                    This changes your shared Team 401 password for both Scouting
                    and Ops.
                  </p>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    aria-label="Current password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    aria-label="New password"
                    placeholder="New password"
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    aria-label="Confirm new password"
                    placeholder="Confirm new password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <Button type="submit" disabled={changingPassword}>
                    <KeyRound />
                    {changingPassword
                      ? 'Changing password…'
                      : 'Change password'}
                  </Button>
                  {passwordMessage && (
                    <p
                      className="text-sm text-muted-foreground"
                      role="status"
                    >
                      {passwordMessage}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Signed-in devices</CardTitle>
                <Badge variant="outline">{accountSessions.length}</Badge>
              </CardHeader>
              <CardContent className="account-sessions space-y-2">
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
        {activeView === 'Offline transfer' && (
          <div className="mx-auto grid w-full max-w-3xl gap-4 p-4 sm:p-6">
            <Card>
              <CardHeader>
                <CardTitle>Receive scouting data</CardTitle>
                <Badge variant={online ? 'outline' : 'destructive'}>
                  {online ? 'Ready to receive' : 'Internet required'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Use this when another scout completed a match without internet.
                  Scan the QR code on their review screen to upload that match.
                </p>
                <p>
                  This device has {queuedCount} local submission
                  {queuedCount === 1 ? '' : 's'} waiting to synchronize.
                </p>
              </CardContent>
            </Card>
            <QrRelay online={online} />
          </div>
        )}
      </section>
      {mobileMenuOpen && (
        <>
        <button
          type="button"
          className="mobile-more-backdrop"
          aria-label="Close more navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className="mobile-more-menu" role="dialog" aria-label="Navigation and account menu">
          <div className="mobile-menu-account">
            <CircleUserRound />
            <div>
              <strong>{session.user.name}</strong>
              <span>{online ? 'Online' : 'Offline ready'}</span>
            </div>
          </div>
          <div className="mobile-menu-links">
          {visibleNav.map(({ label, icon: Icon }) => (
              <button
                type="button"
                aria-current={activeView === label ? 'page' : undefined}
                onClick={() => navigate(label)}
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
            >
              <UserCog />
              <span>Admin</span>
            </button>
          )}
          <button
            type="button"
            aria-current={activeView === 'Account' ? 'page' : undefined}
            onClick={() => navigate('Account')}
          >
            <CircleUserRound />
            <span>Account</span>
          </button>
          </div>
          <button
            type="button"
            className="mobile-theme-toggle"
            onClick={() => {
              toggleTheme();
              setMobileMenuOpen(false);
            }}
          >
            {dark ? <Sun /> : <Moon />}
            <span>{dark ? 'Use light mode' : 'Use dark mode'}</span>
          </button>
        </div>
        </>
      )}
    </main>
  );
}
