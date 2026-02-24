import { Elysia, t } from "elysia";
import { db } from "../db/index.js";

export const goalsRoutes = new Elysia()
  // List all goals with milestones
  .get("/api/goals", () => {
    const goals = db
      .query<
        {
          id: number;
          title: string;
          description: string | null;
          target_date: string | null;
          status: string;
          created_at: string;
        },
        []
      >(`SELECT * FROM goals ORDER BY created_at DESC`)
      .all();

    return goals.map((g) => {
      const milestones = db
        .query<
          {
            id: number;
            goal_id: number;
            title: string;
            completed_at: string | null;
            position: number;
          },
          [number]
        >(`SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY position ASC`)
        .all(g.id);

      const total = milestones.length;
      const done = milestones.filter((m) => m.completed_at).length;

      return {
        ...g,
        milestones,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    });
  })

  // Create goal
  .post(
    "/api/goals",
    ({ body }) => {
      const { title, description, target_date } = body;
      const result = db
        .query<{ id: number }, [string, string | null, string | null]>(
          `INSERT INTO goals (title, description, target_date) VALUES (?, ?, ?) RETURNING id`
        )
        .get(title, description ?? null, target_date ?? null);
      const goal = db
        .query<
          {
            id: number;
            title: string;
            description: string | null;
            target_date: string | null;
            status: string;
            created_at: string;
          },
          [number]
        >(`SELECT * FROM goals WHERE id = ?`)
        .get(result!.id);
      return { ...goal, milestones: [], progress: 0 };
    },
    {
      body: t.Object({
        title: t.String(),
        description: t.Optional(t.String()),
        target_date: t.Optional(t.String()),
      }),
    }
  )

  // Update goal (status, title, etc.)
  .patch(
    "/api/goals/:id",
    ({ params, body }) => {
      const id = parseInt(params.id, 10);
      const { title, description, target_date, status } = body;
      if (title !== undefined) db.run(`UPDATE goals SET title = ? WHERE id = ?`, [title, id]);
      if (description !== undefined)
        db.run(`UPDATE goals SET description = ? WHERE id = ?`, [description, id]);
      if (target_date !== undefined)
        db.run(`UPDATE goals SET target_date = ? WHERE id = ?`, [target_date, id]);
      if (status !== undefined) db.run(`UPDATE goals SET status = ? WHERE id = ?`, [status, id]);
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String()),
        description: t.Optional(t.String()),
        target_date: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // Delete goal
  .delete(
    "/api/goals/:id",
    ({ params }) => {
      db.run(`DELETE FROM goals WHERE id = ?`, [parseInt(params.id, 10)]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Add milestone
  .post(
    "/api/goals/:id/milestones",
    ({ params, body }) => {
      const goalId = parseInt(params.id, 10);
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
        .get(goalId, body.title, position);
      return db
        .query<
          {
            id: number;
            goal_id: number;
            title: string;
            completed_at: string | null;
            position: number;
          },
          [number]
        >(`SELECT * FROM goal_milestones WHERE id = ?`)
        .get(result!.id);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ title: t.String() }),
    }
  )

  // Toggle milestone completion
  .patch(
    "/api/goals/:id/milestones/:milestoneId",
    ({ params }) => {
      const mid = parseInt(params.milestoneId, 10);
      const current = db
        .query<{ completed_at: string | null }, [number]>(
          `SELECT completed_at FROM goal_milestones WHERE id = ?`
        )
        .get(mid);

      if (current?.completed_at) {
        db.run(`UPDATE goal_milestones SET completed_at = NULL WHERE id = ?`, [mid]);
      } else {
        db.run(`UPDATE goal_milestones SET completed_at = datetime('now') WHERE id = ?`, [mid]);
      }
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), milestoneId: t.String() }) }
  )

  // Delete milestone
  .delete(
    "/api/goals/:id/milestones/:milestoneId",
    ({ params }) => {
      db.run(`DELETE FROM goal_milestones WHERE id = ?`, [parseInt(params.milestoneId, 10)]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), milestoneId: t.String() }) }
  );
