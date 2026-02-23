import type { FastifyInstance } from "fastify";
import { db, getStreak } from "../db/index.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", () => {
    const today = new Date().toISOString().split("T")[0];

    // Habits
    const habits = db
      .query<{ id: number; name: string; color: string; icon: string }, []>(
        `SELECT id, name, color, icon FROM habits ORDER BY created_at ASC`
      )
      .all();

    const habitsWithStatus = habits.map((h) => {
      const completion = db
        .query<{ id: number }, [number, string]>(
          `SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`
        )
        .get(h.id, today);
      return {
        ...h,
        completedToday: !!completion,
        streak: getStreak(h.id),
      };
    });

    const habitsDoneToday = habitsWithStatus.filter((h) => h.completedToday).length;

    // Last workout
    const lastSession = db
      .query<{ id: number; date: string; notes: string | null }, []>(
        `SELECT id, date, notes FROM workout_sessions ORDER BY date DESC LIMIT 1`
      )
      .get();

    let lastWorkout = null;
    if (lastSession) {
      const sets = db
        .query<{ exercise_name: string; reps: number; weight_kg: number; is_pr: number }, [number]>(
          `SELECT e.name as exercise_name, ws.reps, ws.weight_kg, ws.is_pr
           FROM workout_sets ws JOIN exercises e ON ws.exercise_id = e.id
           WHERE ws.session_id = ?`
        )
        .all(lastSession.id);

      const exerciseNames = [...new Set(sets.map((s) => s.exercise_name))];
      const prCount = sets.filter((s) => s.is_pr).length;

      lastWorkout = {
        ...lastSession,
        exerciseNames,
        totalSets: sets.length,
        prCount,
      };
    }

    // Active goals
    const goals = db
      .query<{ id: number; title: string; status: string; target_date: string | null }, []>(
        `SELECT id, title, status, target_date FROM goals WHERE status = 'active' LIMIT 5`
      )
      .all();

    const goalsWithProgress = goals.map((g) => {
      const total = db.query<{ c: number }, [number]>(`SELECT COUNT(*) as c FROM goal_milestones WHERE goal_id = ?`).get(g.id)?.c ?? 0;
      const done = db.query<{ c: number }, [number]>(`SELECT COUNT(*) as c FROM goal_milestones WHERE goal_id = ? AND completed_at IS NOT NULL`).get(g.id)?.c ?? 0;
      return { ...g, progress: total > 0 ? Math.round((done / total) * 100) : 0, totalMilestones: total, doneMilestones: done };
    });

    // Today's nutrition
    const nutrition = db
      .query<{ calories: number; protein_g: number; carbs_g: number; fat_g: number }, [string]>(
        `SELECT calories, protein_g, carbs_g, fat_g FROM nutrition_logs WHERE date = ?`
      )
      .get(today) ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

    // Weekly habit completion rate (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDates.push(d.toISOString().split("T")[0]);
    }

    const weeklyData = weekDates.map((date) => {
      const completed = db
        .query<{ c: number }, [string]>(
          `SELECT COUNT(DISTINCT habit_id) as c FROM habit_completions WHERE completed_date = ?`
        )
        .get(date)?.c ?? 0;
      return { date, completed, total: habits.length };
    });

    return {
      today,
      habits: habitsWithStatus,
      habitsDoneToday,
      totalHabits: habits.length,
      lastWorkout,
      goals: goalsWithProgress,
      nutrition,
      weeklyData,
    };
  });
}
