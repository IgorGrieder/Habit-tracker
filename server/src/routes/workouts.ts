import type { FastifyInstance } from "fastify";
import { db, checkAndMarkPR } from "../db/index.js";

export async function workoutsRoutes(app: FastifyInstance) {
  // List exercises
  app.get("/api/exercises", () => {
    return db
      .query<{ id: number; name: string; muscle_group: string | null }, []>(
        `SELECT * FROM exercises ORDER BY name ASC`
      )
      .all();
  });

  // Create or get exercise
  app.post<{ Body: { name: string; muscle_group?: string } }>(
    "/api/exercises",
    { schema: { body: { type: "object", required: ["name"], properties: { name: { type: "string" }, muscle_group: { type: "string" } } } } },
    (req) => {
      const { name, muscle_group } = req.body;
      db.run(
        `INSERT OR IGNORE INTO exercises (name, muscle_group) VALUES (?, ?)`,
        [name, muscle_group ?? null]
      );
      return db
        .query<{ id: number; name: string; muscle_group: string | null }, [string]>(
          `SELECT * FROM exercises WHERE name = ?`
        )
        .get(name);
    }
  );

  // Get exercise progress (weight over time for chart)
  app.get<{ Params: { id: string } }>("/api/exercises/:id/progress", (req) => {
    return db
      .query<{ date: string; max_weight: number; total_reps: number }, [number]>(
        `SELECT sess.date, MAX(ws.weight_kg) as max_weight, SUM(ws.reps) as total_reps
         FROM workout_sets ws
         JOIN workout_sessions sess ON ws.session_id = sess.id
         WHERE ws.exercise_id = ?
         GROUP BY sess.date
         ORDER BY sess.date ASC
         LIMIT 30`
      )
      .all(parseInt(req.params.id));
  });

  // List sessions (most recent first)
  app.get("/api/sessions", () => {
    const sessions = db
      .query<{ id: number; date: string; notes: string | null; created_at: string }, []>(
        `SELECT * FROM workout_sessions ORDER BY date DESC LIMIT 20`
      )
      .all();

    return sessions.map((s) => {
      const sets = db
        .query<{ exercise_name: string; reps: number; weight_kg: number; is_pr: number; set_number: number }, [number]>(
          `SELECT e.name as exercise_name, ws.reps, ws.weight_kg, ws.is_pr, ws.set_number
           FROM workout_sets ws
           JOIN exercises e ON ws.exercise_id = e.id
           WHERE ws.session_id = ?
           ORDER BY ws.set_number ASC`
        )
        .all(s.id);

      const exerciseMap: Record<string, { sets: typeof sets; hasPR: boolean }> = {};
      for (const set of sets) {
        if (!exerciseMap[set.exercise_name]) {
          exerciseMap[set.exercise_name] = { sets: [], hasPR: false };
        }
        exerciseMap[set.exercise_name].sets.push(set);
        if (set.is_pr) exerciseMap[set.exercise_name].hasPR = true;
      }

      return {
        ...s,
        exercises: Object.entries(exerciseMap).map(([name, data]) => ({
          name,
          sets: data.sets,
          hasPR: data.hasPR,
        })),
        totalSets: sets.length,
        prCount: sets.filter((s) => s.is_pr).length,
      };
    });
  });

  // Create session
  app.post<{ Body: { date?: string; notes?: string } }>(
    "/api/sessions",
    { schema: { body: { type: "object", properties: { date: { type: "string" }, notes: { type: "string" } } } } },
    (req) => {
      const date = req.body.date ?? new Date().toISOString().split("T")[0];
      const result = db
        .query<{ id: number }, [string, string | null]>(
          `INSERT INTO workout_sessions (date, notes) VALUES (?, ?) RETURNING id`
        )
        .get(date, req.body.notes ?? null);
      return db
        .query<{ id: number; date: string; notes: string | null }, [number]>(
          `SELECT * FROM workout_sessions WHERE id = ?`
        )
        .get(result!.id);
    }
  );

  // Delete session
  app.delete<{ Params: { id: string } }>("/api/sessions/:id", (req, reply) => {
    db.run(`DELETE FROM workout_sessions WHERE id = ?`, [parseInt(req.params.id)]);
    reply.send({ ok: true });
  });

  // Add sets to a session
  app.post<{
    Params: { id: string };
    Body: {
      exercise_name: string;
      muscle_group?: string;
      sets: { reps: number; weight_kg: number }[];
    };
  }>(
    "/api/sessions/:id/sets",
    {
      schema: {
        body: {
          type: "object",
          required: ["exercise_name", "sets"],
          properties: {
            exercise_name: { type: "string" },
            muscle_group: { type: "string" },
            sets: { type: "array", items: { type: "object", required: ["reps", "weight_kg"], properties: { reps: { type: "number" }, weight_kg: { type: "number" } } } },
          },
        },
      },
    },
    (req) => {
      const sessionId = parseInt(req.params.id);
      const { exercise_name, muscle_group, sets } = req.body;

      db.run(`INSERT OR IGNORE INTO exercises (name, muscle_group) VALUES (?, ?)`, [
        exercise_name,
        muscle_group ?? null,
      ]);
      const exercise = db
        .query<{ id: number }, [string]>(`SELECT id FROM exercises WHERE name = ?`)
        .get(exercise_name)!;

      const inserted = sets.map((set, i) => {
        const isPR = checkAndMarkPR(sessionId, exercise.id, set.reps, set.weight_kg);
        const result = db
          .query<{ id: number }, [number, number, number, number, number, number]>(
            `INSERT INTO workout_sets (session_id, exercise_id, set_number, reps, weight_kg, is_pr)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
          )
          .get(sessionId, exercise.id, i + 1, set.reps, set.weight_kg, isPR ? 1 : 0);
        return { id: result!.id, ...set, is_pr: isPR, set_number: i + 1 };
      });

      return { exercise_name, sets: inserted };
    }
  );

  // Delete a set
  app.delete<{ Params: { id: string; setId: string } }>(
    "/api/sessions/:id/sets/:setId",
    (req, reply) => {
      db.run(`DELETE FROM workout_sets WHERE id = ? AND session_id = ?`, [
        parseInt(req.params.setId),
        parseInt(req.params.id),
      ]);
      reply.send({ ok: true });
    }
  );
}
