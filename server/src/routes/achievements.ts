import type { FastifyInstance } from "fastify";
import { db, getStreak } from "../db/index.js";

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
  // Milestones
  {
    id: "first_step",
    title: "First Step",
    desc: "Log your first habit completion",
    icon: "👣",
    category: "milestone",
    check: (s) => s.totalCompletions >= 1,
  },
  {
    id: "ten_done",
    title: "Getting Started",
    desc: "Complete 10 habit check-ins",
    icon: "🌱",
    category: "milestone",
    check: (s) => s.totalCompletions >= 10,
  },
  {
    id: "fifty_done",
    title: "Building Momentum",
    desc: "Complete 50 habit check-ins",
    icon: "⚡",
    category: "milestone",
    check: (s) => s.totalCompletions >= 50,
  },
  {
    id: "century",
    title: "Century",
    desc: "Complete 100 habit check-ins",
    icon: "💯",
    category: "milestone",
    check: (s) => s.totalCompletions >= 100,
  },
  {
    id: "five_hundred",
    title: "The Grind",
    desc: "Complete 500 habit check-ins",
    icon: "🏆",
    category: "milestone",
    check: (s) => s.totalCompletions >= 500,
  },
  // Streaks
  {
    id: "streak_3",
    title: "Warm Up",
    desc: "Reach a 3-day streak on any habit",
    icon: "🔥",
    category: "streak",
    check: (s) => s.maxStreak >= 3,
  },
  {
    id: "streak_7",
    title: "Week Warrior",
    desc: "Reach a 7-day streak on any habit",
    icon: "🗡️",
    category: "streak",
    check: (s) => s.maxStreak >= 7,
  },
  {
    id: "streak_14",
    title: "Two Weeks Strong",
    desc: "Reach a 14-day streak on any habit",
    icon: "⚔️",
    category: "streak",
    check: (s) => s.maxStreak >= 14,
  },
  {
    id: "streak_30",
    title: "Unstoppable",
    desc: "Reach a 30-day streak on any habit",
    icon: "🌋",
    category: "streak",
    check: (s) => s.maxStreak >= 30,
  },
  {
    id: "streak_100",
    title: "Centurion",
    desc: "Reach a 100-day streak on any habit",
    icon: "👑",
    category: "streak",
    check: (s) => s.maxStreak >= 100,
  },
  // Consistency
  {
    id: "perfect_1",
    title: "Perfect Day",
    desc: "Complete every habit in a single day",
    icon: "✨",
    category: "consistency",
    check: (s) => s.perfectDays >= 1,
  },
  {
    id: "perfect_7",
    title: "Flawless Week",
    desc: "Achieve 7 perfect days",
    icon: "💎",
    category: "consistency",
    check: (s) => s.perfectDays >= 7,
  },
  {
    id: "perfect_30",
    title: "The Machine",
    desc: "Achieve 30 perfect days",
    icon: "🤖",
    category: "consistency",
    check: (s) => s.perfectDays >= 30,
  },
  {
    id: "active_30",
    title: "Committed",
    desc: "Be active for 30 different days",
    icon: "📅",
    category: "consistency",
    check: (s) => s.activeDays >= 30,
  },
  {
    id: "active_100",
    title: "Lifestyle",
    desc: "Be active for 100 different days",
    icon: "🧬",
    category: "consistency",
    check: (s) => s.activeDays >= 100,
  },
];

function computeStats(): Stats {
  const totalRow = db
    .query<{ cnt: number }, []>("SELECT COUNT(*) as cnt FROM habit_completions")
    .get();
  const totalCompletions = totalRow?.cnt ?? 0;

  const habitRow = db
    .query<{ cnt: number }, []>("SELECT COUNT(*) as cnt FROM habits")
    .get();
  const habitCount = habitRow?.cnt ?? 0;

  // Perfect days: days where distinct completed habits === habitCount
  let perfectDays = 0;
  if (habitCount > 0) {
    const pdRows = db
      .query<{ cnt: number }, [number]>(
        `SELECT COUNT(*) as cnt FROM (
          SELECT completed_date FROM habit_completions
          GROUP BY completed_date
          HAVING COUNT(DISTINCT habit_id) = ?
        )`
      )
      .get(habitCount);
    perfectDays = pdRows?.cnt ?? 0;
  }

  const activeRow = db
    .query<{ cnt: number }, []>(
      "SELECT COUNT(DISTINCT completed_date) as cnt FROM habit_completions"
    )
    .get();
  const activeDays = activeRow?.cnt ?? 0;

  // Max current streak across all habits
  const habits = db
    .query<{ id: number }, []>("SELECT id FROM habits")
    .all();
  let maxStreak = 0;
  for (const h of habits) {
    const s = getStreak(h.id);
    if (s > maxStreak) maxStreak = s;
  }

  return { totalCompletions, habitCount, perfectDays, activeDays, maxStreak };
}

export async function achievementsRoutes(app: FastifyInstance) {
  app.get("/api/achievements", () => {
    const stats = computeStats();

    const existingUnlocks = db
      .query<{ id: string; unlocked_at: string }, []>(
        "SELECT id, unlocked_at FROM achievement_unlocks"
      )
      .all();
    const unlockMap = new Map(existingUnlocks.map((r) => [r.id, r.unlocked_at]));

    const insert = db.prepare(
      "INSERT OR IGNORE INTO achievement_unlocks (id) VALUES (?)"
    );

    return ACHIEVEMENTS.map((a) => {
      const isUnlocked = a.check(stats);
      if (isUnlocked && !unlockMap.has(a.id)) {
        insert.run(a.id);
        // fetch the just-inserted timestamp
        const row = db
          .query<{ unlocked_at: string }, [string]>(
            "SELECT unlocked_at FROM achievement_unlocks WHERE id = ?"
          )
          .get(a.id);
        unlockMap.set(a.id, row?.unlocked_at ?? new Date().toISOString());
      }
      return {
        id: a.id,
        title: a.title,
        desc: a.desc,
        icon: a.icon,
        category: a.category,
        unlocked: isUnlocked,
        unlockedAt: isUnlocked ? (unlockMap.get(a.id) ?? null) : null,
      };
    });
  });
}
