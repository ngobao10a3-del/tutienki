export interface AdvancedWorldTime {
  readonly day: number;
  readonly month: number;
  readonly year: number;
  readonly totalDays: number;
}

export function advanceWorldTime(
  time: { day: number; month: number; year: number; totalDays: number },
  days: number,
): AdvancedWorldTime {
  const total = time.totalDays + days;
  const day = ((time.day - 1 + days) % 30) + 1;
  const monthOffset = Math.floor((time.day - 1 + days) / 30);
  const month = ((time.month - 1 + monthOffset) % 12) + 1;
  const year = time.year + Math.floor((time.month - 1 + monthOffset) / 12);
  return { day, month, year, totalDays: total };
}
