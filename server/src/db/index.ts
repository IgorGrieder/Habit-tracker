import { Types, SessionModel } from "./mongoose.js";

// Returns "YYYY-MM-DD" in America/Sao_Paulo timezone
export function todayBR(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// Returns "YYYY-MM-DD" for N days ago in Brazil timezone
export function dateBR(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

// Parses "0,1,2,3,4,5,6" schedule string into a Set of weekday numbers
export function parseSchedule(s: string): Set<number> {
  return new Set(s.split(",").map(Number));
}

// Returns 0 (Sun) … 6 (Sat) for a "YYYY-MM-DD" calendar date string
export function getDayOfWeekForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use noon UTC so the date never shifts across a day boundary regardless of server TZ
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

// Pure function — no DB call. Takes schedule string and array of completed dates.
export function getStreak(schedule: string, completions: string[]): number {
  const scheduledDays = parseSchedule(schedule);
  const today = todayBR();

  if (completions.length === 0) return 0;

  const dateSet = new Set(completions);
  let streak = 0;
  const todayDow = getDayOfWeekForDate(today);
  let daysAgo = scheduledDays.has(todayDow) && dateSet.has(today) ? 0 : 1;
  const SAFETY_LIMIT = 400;

  while (daysAgo < SAFETY_LIMIT) {
    const dateStr = dateBR(daysAgo);
    const dow = getDayOfWeekForDate(dateStr);

    if (!scheduledDays.has(dow)) {
      daysAgo++;
      continue;
    }

    if (dateSet.has(dateStr)) {
      streak++;
      daysAgo++;
    } else {
      break;
    }
  }

  return streak;
}

// Async — checks if the given weight is a PR for this exercise+reps combo across all sessions
export async function checkAndMarkPR(
  excludeSessionId: Types.ObjectId,
  exerciseName: string,
  reps: number,
  weightKg: number
): Promise<boolean> {
  const result = await SessionModel.aggregate([
    { $match: { _id: { $ne: excludeSessionId } } },
    { $unwind: "$exercises" },
    { $match: { "exercises.name": exerciseName } },
    { $unwind: "$exercises.sets" },
    { $match: { "exercises.sets.reps": reps } },
    { $group: { _id: null, maxWeight: { $max: "$exercises.sets.weight_kg" } } },
  ]);

  const maxWeight = result[0]?.maxWeight ?? null;
  return maxWeight === null || weightKg > maxWeight;
}
