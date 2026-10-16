// Shared rules for event controls and per-hour coverage. Kept free of imports so
// the node test runner can load it directly.

export type EventControls = {
  scoutingEnabled: boolean;
  outreachEnabled: boolean;
};

export type CoverageItem = {
  kind: 'role' | 'scouting';
  // Role name for roles; display station (for example "Red 1") for scouting.
  label: string;
};

export const pitRoles = [
  'Pit Crew',
  'Pit Lead',
  'Pit Outreach',
  'Pit Programmer',
] as const;

const scoutingRoles: readonly string[] = ['Scouting', 'Scouting Lead'];

// Pit Scouting is intentionally not gated by the scouting control; it is pit
// interviewing rather than match scouting.
export function roleEnabled(role: string, controls: EventControls) {
  if (role === 'Pit Outreach') return controls.outreachEnabled;
  if (scoutingRoles.includes(role)) return controls.scoutingEnabled;
  return true;
}

export type CoverageTarget = {
  label: string;
  need: number;
  gate: 'scouting' | 'outreach' | null;
  matches: (item: CoverageItem) => boolean;
};

const role =
  (name: string) =>
  (item: CoverageItem): boolean =>
    item.kind === 'role' && item.label === name;

const station =
  (color: 'Red' | 'Blue') =>
  (item: CoverageItem): boolean =>
    item.kind === 'scouting' && item.label.startsWith(`${color} `);

// Needed in every displayed hour. Shortfalls are reported, never treated as errors.
export const coverageTargets: CoverageTarget[] = [
  { label: 'Pit Crew', need: 2, gate: null, matches: role('Pit Crew') },
  { label: 'Pit Lead', need: 1, gate: null, matches: role('Pit Lead') },
  {
    label: 'Pit Programmer',
    need: 1,
    gate: null,
    matches: role('Pit Programmer'),
  },
  { label: 'Red scouts', need: 3, gate: 'scouting', matches: station('Red') },
  { label: 'Blue scouts', need: 3, gate: 'scouting', matches: station('Blue') },
  {
    label: 'Scouting Lead',
    need: 1,
    gate: 'scouting',
    matches: role('Scouting Lead'),
  },
  {
    label: 'Pit Outreach',
    need: 1,
    gate: 'outreach',
    matches: role('Pit Outreach'),
  },
  { label: 'Team Media', need: 1, gate: null, matches: role('Team Media') },
];

// Targets that apply under the current controls. Turning scouting or outreach
// off removes their targets so they are never shown as missing.
export function activeCoverageTargets(controls: EventControls) {
  return coverageTargets.filter(
    (target) =>
      target.gate === null ||
      (target.gate === 'scouting'
        ? controls.scoutingEnabled
        : controls.outreachEnabled),
  );
}

export function coverageCount(target: CoverageTarget, items: CoverageItem[]) {
  return items.filter(target.matches).length;
}

export function summarizeShifts(items: CoverageItem[]) {
  let scouting = 0;
  let pit = 0;
  for (const item of items) {
    if (item.kind === 'scouting') scouting += 1;
    else if ((pitRoles as readonly string[]).includes(item.label)) pit += 1;
  }
  return { scouting, pit, total: items.length };
}
