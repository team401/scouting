export const vablaTeams: number[] = [
  401, 449, 977, 1086, 1262, 1629, 1793, 1885, 2016, 2963, 3361, 3939, 4456,
  4575, 4967, 5724, 5804, 5830, 5841, 6189, 6194, 6802, 7429, 8230, 9003, 9033,
  9403, 9496,
];

export const vafalTeams: number[] = [
  116, 122, 339, 401, 539, 611, 612, 619, 620, 623, 1418, 1731, 1885, 1895,
  1915, 2028, 2186, 2363, 2421, 2900, 2912, 3359, 3373, 4472, 4821, 5243, 5338,
  5549, 5587, 8230, 8590, 9033, 9235, 9403,
];

export const dcmpTeams: number[] = [];

export const worldsTeams: number[] = [];

export const teamsList =
  new Date() < new Date("2024-03-04")
    ? vablaTeams
    : new Date() < new Date("2024-04-04")
    ? vafalTeams
    : new Date() < new Date("2024-04-17")
    ? dcmpTeams
    : worldsTeams;
