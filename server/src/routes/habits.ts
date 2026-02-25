import { Elysia, t } from "elysia";
import { HabitModel } from "../db/mongoose.js";
import { dateBR, getDayOfWeekForDate, getStreak, parseSchedule, todayBR } from "../db/index.js";

export const habitsRoutes = new Elysia()
  // List all habits with today's status + streak
  .get("/api/habits", async () => {
    const today = todayBR();
    const todayDow = getDayOfWeekForDate(today);
    const habits = await HabitModel.find().sort({ created_at: 1 }).lean();

    return habits.map((h) => {
      const completions: string[] = h.completions ?? [];
      const scheduledDays = parseSchedule(h.schedule ?? "0,1,2,3,4,5,6");
      return {
        id: h._id.toString(),
        name: h.name,
        color: h.color,
        icon: h.icon,
        why: h.why ?? null,
        schedule: h.schedule ?? "0,1,2,3,4,5,6",
        created_at: h.created_at,
        completedToday: completions.includes(today),
        streak: getStreak(h.schedule ?? "0,1,2,3,4,5,6", completions),
        scheduledToday: scheduledDays.has(todayDow),
      };
    });
  })

  // Aggregate calendar — per-day completion % across scheduled habits
  .get(
    "/api/habits/calendar",
    async ({ query }) => {
      const days = parseInt(query.days ?? "28", 10);
      const habits = await HabitModel.find({}, "schedule completions").lean();

      const habitSchedules = habits.map((h) => ({
        scheduleDays: parseSchedule(h.schedule ?? "0,1,2,3,4,5,6"),
        completions: new Set<string>(h.completions ?? []),
      }));

      const result: { date: string; completed: number; total: number; pct: number }[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = dateBR(i);
        const dow = getDayOfWeekForDate(date);

        const scheduled = habitSchedules.filter((h) => h.scheduleDays.has(dow));
        const total = scheduled.length;

        if (total === 0) {
          result.push({ date, completed: 0, total: 0, pct: 0 });
          continue;
        }

        const completed = scheduled.filter((h) => h.completions.has(date)).length;
        result.push({
          date,
          completed,
          total,
          pct: Math.round((completed / total) * 100),
        });
      }
      return result;
    },
    { query: t.Object({ days: t.Optional(t.String()) }) }
  )

  // Get history (last N days) for a habit
  .get(
    "/api/habits/:id/history",
    async ({ params, query }) => {
      const days = parseInt(query.days ?? "28", 10);
      const habit = await HabitModel.findById(params.id).lean();
      const scheduledDays = parseSchedule(habit?.schedule ?? "0,1,2,3,4,5,6");
      const dateSet = new Set<string>(habit?.completions ?? []);

      const result: { date: string; completed: boolean; scheduled: boolean }[] = [];
      for (let i = 0; i < days; i++) {
        const d = dateBR(i);
        const dow = getDayOfWeekForDate(d);
        result.unshift({ date: d, completed: dateSet.has(d), scheduled: scheduledDays.has(dow) });
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ days: t.Optional(t.String()) }),
    }
  )

  // Create habit
  .post(
    "/api/habits",
    async ({ body }) => {
      const { name, color = "#e8b04b", icon = "⚡", why, schedule = "0,1,2,3,4,5,6" } = body;
      const created_at = todayBR();
      const doc = { name, color, icon, why: why ?? null, schedule, created_at, completions: [] };
      const result = await HabitModel.create(doc);

      const today = todayBR();
      const todayDow = getDayOfWeekForDate(today);
      const scheduledDays = parseSchedule(schedule);

      return {
        id: result._id.toString(),
        name,
        color,
        icon,
        why: why ?? null,
        schedule,
        created_at,
        completedToday: false,
        streak: 0,
        scheduledToday: scheduledDays.has(todayDow),
      };
    },
    {
      body: t.Object({
        name: t.String(),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        why: t.Optional(t.String()),
        schedule: t.Optional(t.String()),
      }),
    }
  )

  // Update habit (why and/or schedule)
  .patch(
    "/api/habits/:id",
    async ({ params, body }) => {
      const updates: Record<string, unknown> = {};
      if (body.why !== undefined) updates.why = body.why || null;
      if (body.schedule !== undefined) updates.schedule = body.schedule;
      if (Object.keys(updates).length > 0) {
        await HabitModel.updateOne({ _id: params.id }, { $set: updates });
      }
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        why: t.Optional(t.String()),
        schedule: t.Optional(t.String()),
      }),
    }
  )

  // Delete habit
  .delete(
    "/api/habits/:id",
    async ({ params }) => {
      await HabitModel.findByIdAndDelete(params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Mark complete for today
  .post(
    "/api/habits/:id/complete",
    async ({ params }) => {
      const today = todayBR();
      await HabitModel.updateOne({ _id: params.id }, { $addToSet: { completions: today } });
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Unmark today
  .delete(
    "/api/habits/:id/complete",
    async ({ params }) => {
      const today = todayBR();
      await HabitModel.updateOne({ _id: params.id }, { $pull: { completions: today } });
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  );
