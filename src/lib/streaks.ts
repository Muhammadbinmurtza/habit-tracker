// Pure streak helpers. Dates are "YYYY-MM-DD" strings in the user's local day.

export function todayLocal(): string {
  const d = new Date();
  return formatLocal(d);
}

export function formatLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, dd] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, dd);
  date.setDate(date.getDate() + n);
  return formatLocal(date);
}

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const A = new Date(ya, ma - 1, da).getTime();
  const B = new Date(yb, mb - 1, db).getTime();
  return Math.round((B - A) / 86400000);
}

/** Current streak, walking back from today. Today missing is grace (uses yesterday). */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  let cursor = today;
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest consecutive-day run in the set. */
export function longestStreak(dates: Iterable<string>): number {
  const arr = Array.from(new Set(dates)).sort();
  if (arr.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < arr.length; i++) {
    if (addDays(arr[i - 1], 1) === arr[i]) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
