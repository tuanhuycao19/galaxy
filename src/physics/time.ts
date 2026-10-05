const MS_PER_DAY = 86_400_000;
/** J2000.0 epoch: 2000-01-01 12:00 TT, approximated as UTC. */
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

export function dateToJ2000Days(date: Date): number {
  return (date.getTime() - J2000_MS) / MS_PER_DAY;
}

export function j2000DaysToDate(days: number): Date {
  return new Date(J2000_MS + days * MS_PER_DAY);
}
