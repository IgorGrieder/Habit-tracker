import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";

export async function goalsRoutes(app: FastifyInstance) {
  // List all goals with milestones
  app.get("/api/goals", () => {
    const goals = db
      .query<{ id: number; title: string; description: string | null; target_date: string | null; status: string; created_at: string }, []>(
        `SELECT * FROM goals ORDER BY created_at DESC`
      )
      .all();

    return goals.map((g) => {
      const milestones = db
        .query<{ id: number; goal_id: number; title: string; completed_at: string | null; position: number }, [number]>(
          `SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY position ASC`
        )
        .all(g.id);

      const total = milestones.length;
      const done = milestones.filter((m) => m.completed_at).length;

      return {
        ...g,
        milestones,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  });

  // Create goal
  app.post<{ Body: { title: string; description?: string; target_date?: string } }>(
    "/api/goals",
    { schema: { body: { type: "object", required: ["title"], properties: { title: { type: "string" }, description: { type: "string" }, target_date: { type: "string" } } } } },
    (req) => {
      const { title, description, target_date } = req.body;
      const result = db
        .query<{ id: number }, [string, string | null, string | null]>(
          `INSERT INTO goals (title, description, target_date) VALUES (?, ?, ?) RETURNING id`
        )
        .get(title, description ?? null, target_date ?? null);
      const goal = db.query<{ id: number; title: string; description: string | null; target_date: string | null; status: string; created_at: string }, [number]>(`SELECT * FROM goals WHERE id = ?`).get(result!.id);
      return { ...goal, milestones: [], progress: 0 };
    }
  );

  // Update goal (status, title, etc.)
  app.patch<{
    Params: { id: string };
    Body: { title?: string; description?: string; target_date?: string; status?: string };
  }>("/api/goals/:id", (req, reply) => {
    const { title, description, target_date, status } = req.body;
    if (title !== undefined) db.run(`UPDATE goals SET title = ? WHERE id = ?`, [title, parseInt(req.params.id)]);
    if (description !== undefined) db.run(`UPDATE goals SET description = ? WHERE id = ?`, [description, parseInt(req.params.id)]);
    if (target_date !== undefined) db.run(`UPDATE goals SET target_date = ? WHERE id = ?`, [target_date, parseInt(req.params.id)]);
    if (status !== undefined) db.run(`UPDATE goals SET status = ? WHERE id = ?`, [status, parseInt(req.params.id)]);
    reply.send({ ok: true });
  });

  // Delete goal
  app.delete<{ Params: { id: string } }>("/api/goals/:id", (req, reply) => {
    db.run(`DELETE FROM goals WHERE id = ?`, [parseInt(req.params.id)]);
    reply.send({ ok: true });
  });

  // Add milestone
  app.post<{ Params: { id: string }; Body: { title: string } }>(
    "/api/goals/:id/milestones",
    { schema: { body: { type: "object", required: ["title"], properties: { title: { type: "string" } } } } },
    (req) => {
      const goalId = parseInt(req.params.id);
      const maxPos = db
        .query<{ max_pos: number | null }, [number]>(
          `SELECT MAX(position) as max_pos FROM goal_milestones WHERE goal_id = ?`
        )
        .get(goalId);
      const position = (maxPos?.max_pos ?? -1) + 1;
      const result = db
        .query<{ id: number }, [number, string, number]>(
          `INSERT INTO goal_milestones (goal_id, title, position) VALUES (?, ?, ?) RETURNING id`
        )
        .get(goalId, req.body.title, position);
      return db.query<{ id: number; goal_id: number; title: string; completed_at: string | null; position: number }, [number]>(`SELECT * FROM goal_milestones WHERE id = ?`).get(result!.id);
    }
  );

  // Toggle milestone completion
  app.patch<{ Params: { id: string; milestoneId: string } }>(
    "/api/goals/:id/milestones/:milestoneId",
    (req, reply) => {
      const mid = parseInt(req.params.milestoneId);
      const current = db
        .query<{ completed_at: string | null }, [number]>(
          `SELECT completed_at FROM goal_milestones WHERE id = ?`
        )
        .get(mid);

      if (current?.completed_at) {
        db.run(`UPDATE goal_milestones SET completed_at = NULL WHERE id = ?`, [mid]);
      } else {
        db.run(
          `UPDATE goal_milestones SET completed_at = datetime('now') WHERE id = ?`,
          [mid]
        );
      }
      reply.send({ ok: true });
    }
  );

  // Delete milestone
  app.delete<{ Params: { id: string; milestoneId: string } }>(
    "/api/goals/:id/milestones/:milestoneId",
    (req, reply) => {
      db.run(`DELETE FROM goal_milestones WHERE id = ?`, [parseInt(req.params.milestoneId)]);
      reply.send({ ok: true });
    }
  );
}
