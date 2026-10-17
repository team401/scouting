export const eventRoles = [
  ['Inspection', 'Go through the inspection process'],
  [
    'Calibration',
    'Take the robot to the competition field to calibrate cameras and robot systems',
  ],
  [
    'Drive Team',
    'Driver, Operator, Technician, and Human Player who compete with the robot in matches',
  ],
  [
    'Pit Lead',
    'Lead pit crew technical work, robot checklists, safety, and pit rotations',
  ],
  ['Pit Crew', 'Help prepare the robot for matches and make repairs'],
  [
    'Pit Programmer',
    'Make code changes and supervise log reviews and pre-match system tests',
  ],
  ['Pit Outreach', 'Represent the team to judges and other teams in the pit'],
  ['Scouting Lead', 'Manage scouting operations in the stands'],
  [
    'Scouting',
    'Collect data on other robots from the stands to inform strategy and alliance selection',
  ],
  [
    'Pit Scouting',
    'Interview teams about their robots and collect robot pictures',
  ],
  ['Alliance Rep', 'Represent the team during alliance selection'],
  ['Team Media', 'Record photos and videos of the competition and team'],
  ['Spirit Lead', 'Make sure the team is energetic and engaged in the stands'],
] as const;

export type EventRole = (typeof eventRoles)[number][0];
// Generic scouting assignments use the six station choices instead. Keep the
// role defined for existing schedules and descriptions, but do not offer it in
// role pickers.
export const assignableEventRoles = eventRoles.filter(
  ([name]) => name !== 'Scouting',
);
export const eventRoleNames = eventRoles.map(([name]) => name);
export const eventRoleDescription = Object.fromEntries(eventRoles) as Record<
  EventRole,
  string
>;
