export const TBA_OFFSEASON_EVENT_TYPE = 99;
export const FRC_DEMO_TEAM_MIN = 9970;
export const FRC_DEMO_TEAM_MAX = 9999;

export function isOffseasonDemoTeam(
  eventType: number | null,
  teamNumber: number,
) {
  return (
    eventType === TBA_OFFSEASON_EVENT_TYPE &&
    teamNumber >= FRC_DEMO_TEAM_MIN &&
    teamNumber <= FRC_DEMO_TEAM_MAX
  );
}
