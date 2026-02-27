import { Controller, Get } from "@nestjs/common";
import { AchievementUnlockModel, HabitModel } from "../db/mongoose";
import { getDayOfWeekForDate, getStreak, parseSchedule } from "../db/index";

interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  category: "milestone" | "streak" | "consistency";
  check: (stats: Stats) => boolean;
}

interface Stats {
  totalCompletions: number;
  habitCount: number;
  perfectDays: number;
  activeDays: number;
  maxStreak: number;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_step", title: "First Step", desc: "Log your first habit completion", icon: "👣", category: "milestone", check: (s) => s.totalCompletions >= 1 },
  { id: "ten_done", title: "Getting Started", desc: "Complete 10 habit check-ins", icon: "🌱", category: "milestone", check: (s) => s.totalCompletions >= 10 },
  { id: "fifty_done", title: "Building Momentum", desc: "Complete 50 habit check-ins", icon: "⚡", category: "milestone", check: (s) => s.totalCompletions >= 50 },
  { id: "century", title: "Century", desc: "Complete 100 habit check-ins", icon: "💯", category: "milestone", check: (s) => s.totalCompletions >= 100 },
  { id: "five_hundred", title: "The Grind", desc: "Complete 500 habit check-ins", icon: "🏆", category: "milestone", check: (s) => s.totalCompletions >= 500 },
  { id: "streak_3", title: "Warm Up", desc: "Reach a 3-day streak on any habit", icon: "🔥", category: "streak", check: (s) => s.maxStreak >= 3 },
  { id: "streak_7", title: "Week Warrior", desc: "Reach a 7-day streak on any habit", icon: "🗡️", category: "streak", check: (s) => s.maxStreak >= 7 },
  { id: "streak_14", title: "Two Weeks Strong", desc: "Reach a 14-day streak on any habit", icon: "⚔️", category: "streak", check: (s) => s.maxStreak >= 14 },
  { id: "streak_30", title: "Unstoppable", desc: "Reach a 30-day streak on any habit", icon: "🌋", category: "streak", check: (s) => s.maxStreak >= 30 },
  { id: "streak_100", title: "Centurion", desc: "Reach a 100-day streak on any habit", icon: "👑", category: "streak", check: (s) => s.maxStreak >= 100 },
  { id: "perfect_1", title: "Perfect Day", desc: "Complete every habit in a single day", icon: "✨", category: "consistency", check: (s) => s.perfectDays >= 1 },
  { id: "perfect_7", title: "Flawless Week", desc: "Achieve 7 perfect days", icon: "💎", category: "consistency", check: (s) => s.perfectDays >= 7 },
  { id: "perfect_30", title: "The Machine", desc: "Achieve 30 perfect days", icon: "🤖", category: "consistency", check: (s) => s.perfectDays >= 30 },
  { id: "active_30", title: "Committed", desc: "Be active for 30 different days", icon: "📅", category: "consistency", check: (s) => s.activeDays >= 30 },
  { id: "active_100", title: "Lifestyle", desc: "Be active for 100 different days", icon: "🧬", category: "consistency", check: (s) => s.activeDays >= 100 },
];

async function computeStats(): Promise<Stats> {
  const habits = await HabitModel.find({}, "schedule completions").lean();

  const habitCount = habits.length;
  let totalCompletions = 0;

  const allDatesByHabit: { scheduleDays: Set<number>; completions: string[] }[] = [];
  for (const h of habits) {
    const completions: string[] = h.completions ?? [];
    totalCompletions += completions.length;

    allDatesByHabit.push({
      scheduleDays: parseSchedule(h.schedule ?? "0,1,2,3,4,5,6"),
      completions,
    });
  }

  const activeDateSet = new Set<string>();
  for (const h of allDatesByHabit) {
    for (const d of h.completions) {
      activeDateSet.add(d);
    }
  }

  const activeDays = activeDateSet.size;

  let perfectDays = 0;
  if (habitCount > 0) {
    for (const date of activeDateSet) {
      const dow = getDayOfWeekForDate(date);
      const scheduledOnDay = allDatesByHabit.filter((h) => h.scheduleDays.has(dow));

      if (scheduledOnDay.length > 0 && scheduledOnDay.every((h) => h.completions.includes(date))) {
        perfectDays++;
      }
    }
  }

  let maxStreak = 0;
  for (const h of habits) {
    const streak = getStreak(h.schedule ?? "0,1,2,3,4,5,6", h.completions ?? []);
    if (streak > maxStreak) {
      maxStreak = streak;
    }
  }

  return { totalCompletions, habitCount, perfectDays, activeDays, maxStreak };
}

@Controller("api")
export class AchievementsController {
  @Get("achievements")
  async getAchievements() {
    const stats = await computeStats();

    const existingUnlocks = await AchievementUnlockModel.find().lean();
    const unlockMap = new Map(existingUnlocks.map((r) => [r._id, r.unlocked_at]));

    const results = [];

    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = achievement.check(stats);

      if (isUnlocked && !unlockMap.has(achievement.id)) {
        const now = new Date().toISOString();
        await AchievementUnlockModel.updateOne(
          { _id: achievement.id },
          { $setOnInsert: { _id: achievement.id, unlocked_at: now } },
          { upsert: true }
        );
        unlockMap.set(achievement.id, now);
      }

      results.push({
        id: achievement.id,
        title: achievement.title,
        desc: achievement.desc,
        icon: achievement.icon,
        category: achievement.category,
        unlocked: isUnlocked,
        unlockedAt: isUnlocked ? (unlockMap.get(achievement.id) ?? null) : null,
      });
    }

    return results;
  }
}
