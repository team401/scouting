export type FrcScheduleTeam = {
  teamNumber: number;
  station: string;
};

export type FrcScheduleMatch = {
  matchNumber: number;
  startTime: string | null;
  teams: FrcScheduleTeam[];
};

export type FrcScheduleResponse = {
  Schedule?: FrcScheduleMatch[];
  schedule?: FrcScheduleMatch[];
};

export type QualificationScheduleMatch = {
  key: string;
  comp_level: 'qm';
  match_number: number;
  set_number: 1;
  time: number | null;
  predicted_time: null;
  alliances: {
    red: { team_keys: string[]; score: -1 };
    blue: { team_keys: string[]; score: -1 };
  };
  winning_alliance: '';
  actual_time: null;
  score_breakdown: null;
  videos: [];
};

// FIRST returns event-local timestamps without an offset. Convert them with
// the event's IANA timezone so schedules remain correct across DST boundaries.
export function eventLocalTime(value: string | null, timeZone: string | null) {
  if (!value) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(value)) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    value,
  );
  if (!parts) return null;
  const desired = Date.UTC(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
    Number(parts[4]),
    Number(parts[5]),
    Number(parts[6] ?? 0),
  );
  if (!timeZone) return desired;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let result = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const displayed = Object.fromEntries(
      formatter
        .formatToParts(new Date(result))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );
    const displayedAsUtc = Date.UTC(
      displayed.year,
      displayed.month - 1,
      displayed.day,
      displayed.hour,
      displayed.minute,
      displayed.second,
    );
    result += desired - displayedAsUtc;
  }
  return result;
}

export function normalizeQualificationSchedule(
  eventKey: string,
  timeZone: string | null,
  response: FrcScheduleResponse,
): QualificationScheduleMatch[] {
  return (response.Schedule ?? response.schedule ?? [])
    .filter((match) => Number.isInteger(match.matchNumber))
    .map((match) => {
      const alliance = (color: 'Red' | 'Blue') =>
        match.teams
          .filter((team) => team.station.startsWith(color))
          .sort((a, b) => a.station.localeCompare(b.station))
          .map((team) => `frc${team.teamNumber}`);
      return {
        key: `${eventKey}_qm${match.matchNumber}`,
        comp_level: 'qm' as const,
        match_number: match.matchNumber,
        set_number: 1 as const,
        time: eventLocalTime(match.startTime, timeZone),
        predicted_time: null,
        alliances: {
          red: { team_keys: alliance('Red'), score: -1 as const },
          blue: { team_keys: alliance('Blue'), score: -1 as const },
        },
        winning_alliance: '' as const,
        actual_time: null,
        score_breakdown: null,
        videos: [] as [],
      };
    })
    .sort((a, b) => a.match_number - b.match_number);
}
