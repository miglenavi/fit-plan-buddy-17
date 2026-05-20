// Monday-based week helpers
export function weekStart(d: Date | string): string {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function addDays(d: Date | string, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weeksBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = new Date(weekStart(start));
  const last = new Date(weekStart(end));
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur = addDays(cur, 7);
  }
  return out;
}

export function fmtWeekRange(monday: string): string {
  const m = new Date(monday);
  const s = new Date(addDays(m, 6));
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${m.toLocaleDateString(undefined, opts)} – ${s.toLocaleDateString(undefined, opts)}`;
}
