import { Elysia } from "elysia";
import { HabitModel } from "../db/mongoose.js";
import { getDayOfWeekForDate, getStreak, parseSchedule, todayBR } from "../db/index.js";

function sundayWeekDates(weeksAgo: number = 0): string[] {
  const todayStr = todayBR();
  const today = new Date(todayStr + "T12:00:00Z");
  const dow = today.getUTCDay();
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - dow - weeksAgo * 7 + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export const recapRoutes = new Elysia().get("/api/recap", async () => {
  const habits = await HabitModel.find({}, "name icon color schedule completions").lean();

  const habitCount = habits.length;
  const thisWeekDates = sundayWeekDates(0);
  const lastWeekDates = sundayWeekDates(1);

  function weekStats(dates: string[]) {
    let totalCompletions = 0;
    let perfectDays = 0;
    let daysActive = 0;

    const perDay = dates.map((date) => {
      const dow = getDayOfWeekForDate(date);
      const scheduledHabits = habits.filter((h) =>
        parseSchedule(h.schedule ?? "0,1,2,3,4,5,6").has(dow)
      );
      const total = scheduledHabits.length;
      const completed = scheduledHabits.filter((h) =>
        (h.completions ?? []).includes(date)
      ).length;

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      totalCompletions += completed;
      if (completed > 0) daysActive++;
      if (total > 0 && completed === total) perfectDays++;
      return { date, completed, total, pct };
    });

    const habitPct =
      habitCount > 0 ? Math.round(perDay.reduce((s, d) => s + d.pct, 0) / perDay.length) : 0;
    return { habitPct, perfectDays, totalCompletions, daysActive, perDay };
  }

  const thisWeek = weekStats(thisWeekDates);
  const lastWeek = weekStats(lastWeekDates);

  let trend: "up" | "down" | "same" = "same";
  if (thisWeek.habitPct > lastWeek.habitPct) trend = "up";
  else if (thisWeek.habitPct < lastWeek.habitPct) trend = "down";

  let topStreak: { name: string; icon: string; streak: number } | null = null;
  for (const h of habits) {
    const s = getStreak(h.schedule ?? "0,1,2,3,4,5,6", h.completions ?? []);
    if (!topStreak || s > topStreak.streak) {
      topStreak = { name: h.name, icon: h.icon, streak: s };
    }
  }

  const startDate = thisWeekDates[0];
  const endDate = thisWeekDates[thisWeekDates.length - 1];

  const habitBreakdown = habits.map((h) => {
    const completions: string[] = h.completions ?? [];
    const count = completions.filter((d) => d >= startDate && d <= endDate).length;
    const rate = Math.round((count / 7) * 100);
    return { name: h.name, icon: h.icon, color: h.color, completions: count, rate };
  });

  return {
    thisWeek: { ...thisWeek, dateRange: { start: startDate, end: endDate } },
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
