import { Controller, Get } from "@nestjs/common";
import { GoalModel, HabitModel, NutritionModel, SessionModel } from "../db/mongoose";
import { dateBR, getDayOfWeekForDate, getStreak, parseSchedule, todayBR } from "../db/index";

@Controller("api")
export class DashboardController {
  @Get("dashboard")
  async getDashboard() {
    const today = todayBR();
    const todayDow = getDayOfWeekForDate(today);

    const [habits, lastSession, activeGoals, nutrition] = await Promise.all([
      HabitModel.find({}, "name color icon schedule completions created_at").sort({ created_at: 1 }).lean(),
      SessionModel.findOne().sort({ date: -1 }).lean(),
      GoalModel.find({ status: "active" }, "title status target_date milestones").limit(5).lean(),
      NutritionModel.findOne({ date: today }).lean(),
    ]);

    const habitsWithStatus = habits.map((h) => {
      const completions: string[] = h.completions ?? [];
      const schedule = h.schedule ?? "0,1,2,3,4,5,6";
      const scheduledDays = parseSchedule(schedule);

      return {
        id: h._id.toString(),
        name: h.name,
        color: h.color,
        icon: h.icon,
        schedule,
        completedToday: completions.includes(today),
        streak: getStreak(schedule, completions),
        scheduledToday: scheduledDays.has(todayDow),
      };
    });

    const scheduledToday = habitsWithStatus.filter((h) => h.scheduledToday);
    const habitsDoneToday = scheduledToday.filter((h) => h.completedToday).length;

    let lastWorkout: {
      id: string;
      date: string;
      notes: string | null;
      exerciseNames: string[];
      totalSets: number;
      prCount: number;
    } | null = null;

    if (lastSession) {
      const allSets = (lastSession.exercises ?? []).flatMap((ex) => ex.sets ?? []);
      const exerciseNames = (lastSession.exercises ?? []).map((ex) => ex.name);
      const prCount = allSets.filter((s) => s.is_pr).length;

      lastWorkout = {
        id: lastSession._id.toString(),
        date: lastSession.date,
        notes: lastSession.notes ?? null,
        exerciseNames,
        totalSets: allSets.length,
        prCount,
      };
    }

    const goalsWithProgress = activeGoals.map((g) => {
      const milestones = g.milestones ?? [];
      const total = milestones.length;
      const done = milestones.filter((m) => m.completed_at).length;

      return {
        id: g._id.toString(),
        title: g.title,
        status: g.status ?? "active",
        target_date: g.target_date ?? null,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        totalMilestones: total,
        doneMilestones: done,
      };
    });

    const weekDates = Array.from({ length: 7 }, (_, i) => dateBR(6 - i));
    const weeklyData = weekDates.map((date) => {
      const dow = getDayOfWeekForDate(date);
      const scheduledOnDay = habits.filter((h) => parseSchedule(h.schedule ?? "0,1,2,3,4,5,6").has(dow));
      const total = scheduledOnDay.length;

      if (total === 0) {
        return { date, completed: 0, total: 0 };
      }

      const completed = scheduledOnDay.filter((h) => (h.completions ?? []).includes(date)).length;
      return { date, completed, total };
    });

    return {
      today,
      habits: habitsWithStatus,
      habitsDoneToday,
      totalHabits: scheduledToday.length,
      lastWorkout,
      goals: goalsWithProgress,
      nutrition: {
        calories: nutrition?.calories ?? 0,
        protein_g: nutrition?.protein_g ?? 0,
        carbs_g: nutrition?.carbs_g ?? 0,
        fat_g: nutrition?.fat_g ?? 0,
      },
      weeklyData,
    };
  }
}
