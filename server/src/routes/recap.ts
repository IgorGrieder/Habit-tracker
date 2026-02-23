import type { FastifyInstance } from "fastify";
import { db, getStreak } from "../db/index.js";

function dateRange(daysAgo: number, count: number): string[] {
  const dates: string[] = [];
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);
  for (let i = daysAgo + count - 1; i >= daysAgo; i--) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export async function recapRoutes(app: FastifyInstance) {
  app.get("/api/recap", () => {
    const habits = db
      .query<{ id: number; name: string; icon: string; color: string }, []>(
        "SELECT id, name, icon, color FROM habits"
      )
      .all();

    const habitCount = habits.length;

    // date windows
    const thisWeekDates = dateRange(0, 7);   // 6 days ago → today
    const lastWeekDates = dateRange(7, 7);   // 13 days ago → 7 days ago

    function weekStats(dates: string[]) {
      let totalCompletions = 0;
      let perfectDays = 0;
      let daysActive = 0;
      const perDay = dates.map((date) => {
        const row = db
          .query<{ cnt: number }, [string]>(
            "SELECT COUNT(DISTINCT habit_id) as cnt FROM habit_completions WHERE completed_date = ?"
          )
          .get(date);
        const completed = row?.cnt ?? 0;
        const total = habitCount;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        totalCompletions += completed;
        if (completed > 0) daysActive++;
        if (total > 0 && completed === total) perfectDays++;
        return { date, completed, total, pct };
      });
      const habitPct =
        habitCount > 0
          ? Math.round(
              perDay.reduce((s, d) => s + d.pct, 0) / perDay.length
            )
          : 0;
      return { habitPct, perfectDays, totalCompletions, daysActive, perDay };
    }

    const thisWeek = weekStats(thisWeekDates);
    const lastWeek = weekStats(lastWeekDates);

    // trend
    let trend: "up" | "down" | "same" = "same";
    if (thisWeek.habitPct > lastWeek.habitPct) trend = "up";
    else if (thisWeek.habitPct < lastWeek.habitPct) trend = "down";

    // top streak habit
    let topStreak: { name: string; icon: string; streak: number } | null = null;
    for (const h of habits) {
      const s = getStreak(h.id);
      if (!topStreak || s > topStreak.streak) {
        topStreak = { name: h.name, icon: h.icon, streak: s };
      }
    }

    // per-habit breakdown for this week
    const startDate = thisWeekDates[0];
    const endDate = thisWeekDates[thisWeekDates.length - 1];

    const habitBreakdown = habits.map((h) => {
      const row = db
        .query<{ cnt: number }, [number, string, string]>(
          `SELECT COUNT(*) as cnt FROM habit_completions
           WHERE habit_id = ? AND completed_date >= ? AND completed_date <= ?`
        )
        .get(h.id, startDate, endDate);
      const completions = row?.cnt ?? 0;
      const rate = Math.round((completions / 7) * 100);
      return { name: h.name, icon: h.icon, color: h.color, completions, rate };
    });

    return {
      thisWeek: {
        ...thisWeek,
        dateRange: { start: startDate, end: endDate },
      },
      lastWeek: {
        habitPct: lastWeek.habitPct,
        perfectDays: lastWeek.perfectDays,
        totalCompletions: lastWeek.totalCompletions,
        daysActive: lastWeek.daysActive,
      },
      trend,
      topStreak,
      habitBreakdown,
    };
  });
}
