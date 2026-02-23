import type { FastifyInstance } from "fastify";
import { db, getStreak } from "../db/index.js";

export async function habitsRoutes(app: FastifyInstance) {
  // List all habits with today's status + streak
  app.get("/api/habits", () => {
    const today = new Date().toISOString().split("T")[0];
    const habits = db
      .query<
        { id: number; name: string; color: string; icon: string; why: string | null; created_at: string },
        []
      >(`SELECT * FROM habits ORDER BY created_at ASC`)
      .all();

    return habits.map((h) => {
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
  });

  // Create habit
  app.post<{ Body: { name: string; color?: string; icon?: string; why?: string } }>(
    "/api/habits",
    { schema: { body: { type: "object", required: ["name"], properties: { name: { type: "string" }, color: { type: "string" }, icon: { type: "string" }, why: { type: "string" } } } } },
    (req) => {
      const { name, color = "#e8b04b", icon = "⚡", why } = req.body;
      const result = db
        .query<{ id: number }, [string, string, string, string | null]>(
          `INSERT INTO habits (name, color, icon, why) VALUES (?, ?, ?, ?) RETURNING id`
        )
        .get(name, color, icon, why ?? null);
      const habit = db.query<{ id: number; name: string; color: string; icon: string; why: string | null; created_at: string }, [number]>(`SELECT * FROM habits WHERE id = ?`).get(result!.id);
      return { ...habit, completedToday: false, streak: 0 };
    }
  );

  // Update habit why
  app.patch<{ Params: { id: string }; Body: { why: string } }>(
    "/api/habits/:id",
    { schema: { body: { type: "object", required: ["why"], properties: { why: { type: "string" } } } } },
    (req, reply) => {
      db.run(`UPDATE habits SET why = ? WHERE id = ?`, [req.body.why || null, parseInt(req.params.id)]);
      reply.send({ ok: true });
    }
  );

  // Delete habit
  app.delete<{ Params: { id: string } }>("/api/habits/:id", (req, reply) => {
    db.run(`DELETE FROM habits WHERE id = ?`, [parseInt(req.params.id)]);
    reply.send({ ok: true });
  });

  // Mark complete for today
  app.post<{ Params: { id: string } }>("/api/habits/:id/complete", (req, reply) => {
    const today = new Date().toISOString().split("T")[0];
    try {
      db.run(
        `INSERT OR IGNORE INTO habit_completions (habit_id, completed_date) VALUES (?, ?)`,
        [parseInt(req.params.id), today]
      );
    } catch (_) {}
    reply.send({ ok: true });
  });

  // Unmark today
  app.delete<{ Params: { id: string } }>("/api/habits/:id/complete", (req, reply) => {
    const today = new Date().toISOString().split("T")[0];
    db.run(
      `DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?`,
      [parseInt(req.params.id), today]
    );
    reply.send({ ok: true });
  });

  // Aggregate calendar — per-day completion % across all habits
  app.get<{ Querystring: { days?: string } }>("/api/habits/calendar", (req) => {
    const days = parseInt(req.query.days ?? "28");
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
  });

  // Get history (last N days)
  app.get<{ Params: { id: string }; Querystring: { days?: string } }>(
    "/api/habits/:id/history",
    (req) => {
      const days = parseInt(req.query.days ?? "28");
      const rows = db
        .query<{ completed_date: string }, [number]>(
          `SELECT completed_date FROM habit_completions
           WHERE habit_id = ?
           ORDER BY completed_date DESC
           LIMIT 90`
        )
        .all(parseInt(req.params.id));
      const dateSet = new Set(rows.map((r) => r.completed_date));

      const result: { date: string; completed: boolean }[] = [];
      const cur = new Date();
      for (let i = 0; i < days; i++) {
        const d = cur.toISOString().split("T")[0];
        result.unshift({ date: d, completed: dateSet.has(d) });
        cur.setDate(cur.getDate() - 1);
      }
      return result;
    }
  );
}
