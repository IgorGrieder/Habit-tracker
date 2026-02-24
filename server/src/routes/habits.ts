import { Elysia, t } from "elysia";
import { db, getStreak } from "../db/index.js";

export const habitsRoutes = new Elysia()
  // List all habits with today's status + streak
  .get("/api/habits", () => {
    const today = new Date().toISOString().split("T")[0];
    const habits = db
      .query<
        {
          id: number;
          name: string;
          color: string;
          icon: string;
          why: string | null;
          created_at: string;
        },
        []
      >(`SELECT * FROM habits ORDER BY created_at ASC`)
      .all();

    return habits.map((h) => {
      const completion = db
        .query<{ id: number }, [number, string]>(
          `SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`
        )
        .get(h.id, today);
      return { ...h, completedToday: !!completion, streak: getStreak(h.id) };
    });
  })

  // Aggregate calendar — per-day completion % across all habits
  // Must be registered before /:id to avoid param collision
  .get(
    "/api/habits/calendar",
    ({ query }) => {
      const days = parseInt(query.days ?? "28", 10);
      const habitCount =
        db.query<{ c: number }, []>(`SELECT COUNT(*) as c FROM habits`).get()?.c ?? 0;

      const result: { date: string; completed: number; total: number; pct: number }[] = [];
      const cur = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(cur);
        d.setUTCDate(d.getUTCDate() - i);
        const date = d.toISOString().split("T")[0];
        const completed =
          db
            .query<{ c: number }, [string]>(
              `SELECT COUNT(DISTINCT habit_id) as c FROM habit_completions WHERE completed_date = ?`
            )
            .get(date)?.c ?? 0;
        result.push({
          date,
          completed,
          total: habitCount,
          pct: habitCount > 0 ? Math.round((completed / habitCount) * 100) : 0,
        });
      }
      return result;
    },
    { query: t.Object({ days: t.Optional(t.String()) }) }
  )

  // Get history (last N days) for a habit
  .get(
    "/api/habits/:id/history",
    ({ params, query }) => {
      const days = parseInt(query.days ?? "28", 10);
      const rows = db
        .query<{ completed_date: string }, [number]>(
          `SELECT completed_date FROM habit_completions
           WHERE habit_id = ?
           ORDER BY completed_date DESC
           LIMIT 90`
        )
        .all(parseInt(params.id, 10));
      const dateSet = new Set(rows.map((r) => r.completed_date));

      const result: { date: string; completed: boolean }[] = [];
      const cur = new Date();
      for (let i = 0; i < days; i++) {
        const d = cur.toISOString().split("T")[0];
        result.unshift({ date: d, completed: dateSet.has(d) });
        cur.setDate(cur.getDate() - 1);
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
    ({ body }) => {
      const { name, color = "#e8b04b", icon = "⚡", why } = body;
      const result = db
        .query<{ id: number }, [string, string, string, string | null]>(
          `INSERT INTO habits (name, color, icon, why) VALUES (?, ?, ?, ?) RETURNING id`
        )
        .get(name, color, icon, why ?? null);
      const habit = db
        .query<
          {
            id: number;
            name: string;
            color: string;
            icon: string;
            why: string | null;
            created_at: string;
          },
          [number]
        >(`SELECT * FROM habits WHERE id = ?`)
        .get(result!.id);
      return { ...habit, completedToday: false, streak: 0 };
    },
    {
      body: t.Object({
        name: t.String(),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        why: t.Optional(t.String()),
      }),
    }
  )

  // Update habit why
  .patch(
    "/api/habits/:id",
    ({ params, body }) => {
      db.run(`UPDATE habits SET why = ? WHERE id = ?`, [body.why || null, parseInt(params.id, 10)]);
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ why: t.String() }),
    }
  )

  // Delete habit
  .delete(
    "/api/habits/:id",
    ({ params }) => {
      db.run(`DELETE FROM habits WHERE id = ?`, [parseInt(params.id, 10)]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Mark complete for today
  .post(
    "/api/habits/:id/complete",
    ({ params }) => {
      const today = new Date().toISOString().split("T")[0];
      db.run(`INSERT OR IGNORE INTO habit_completions (habit_id, completed_date) VALUES (?, ?)`, [
        parseInt(params.id, 10),
        today,
      ]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Unmark today
  .delete(
    "/api/habits/:id/complete",
    ({ params }) => {
      const today = new Date().toISOString().split("T")[0];
      db.run(`DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?`, [
        parseInt(params.id, 10),
        today,
      ]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  );
