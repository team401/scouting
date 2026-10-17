import type { EventRole } from '@/lib/event-roles';

export function assignmentClass(label: string) {
  if (label.startsWith('Red'))
    return 'bg-red-200 text-red-950 dark:bg-red-950 dark:text-red-100';
  if (label.startsWith('Blue'))
    return 'bg-blue-200 text-blue-950 dark:bg-blue-950 dark:text-blue-100';
  const roleColors: Partial<Record<EventRole, string>> = {
    Inspection:
      'bg-yellow-200 text-yellow-950 dark:bg-yellow-900 dark:text-yellow-100',
    Calibration:
      'bg-indigo-200 text-indigo-950 dark:bg-indigo-900 dark:text-indigo-100',
    'Drive Team': 'bg-purple-600 text-white dark:bg-purple-800',
    'Pit Lead': 'bg-amber-600 text-white dark:bg-amber-800',
    'Pit Crew':
      'bg-orange-300 text-orange-950 dark:bg-orange-900 dark:text-orange-100',
    'Pit Programmer':
      'bg-cyan-200 text-cyan-950 dark:bg-cyan-900 dark:text-cyan-100',
    'Pit Outreach':
      'bg-lime-200 text-lime-950 dark:bg-lime-900 dark:text-lime-100',
    'Scouting Lead': 'bg-emerald-600 text-white dark:bg-emerald-800',
    Scouting:
      'bg-green-200 text-green-950 dark:bg-green-900 dark:text-green-100',
    'Pit Scouting':
      'bg-teal-200 text-teal-950 dark:bg-teal-900 dark:text-teal-100',
    'Alliance Rep': 'bg-rose-600 text-white dark:bg-rose-800',
    'Team Media': 'bg-sky-600 text-white dark:bg-sky-800',
    'Spirit Lead':
      'bg-pink-300 text-pink-950 dark:bg-pink-900 dark:text-pink-100',
  };
  if (roleColors[label as EventRole]) return roleColors[label as EventRole]!;
  return 'bg-primary/15 text-foreground';
}
