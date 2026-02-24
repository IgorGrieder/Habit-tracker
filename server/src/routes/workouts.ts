import { Elysia, t } from "elysia";
import { checkAndMarkPR, db } from "../db/index.js";

export const workoutsRoutes = new Elysia()
  // List exercises
  .get("/api/exercises", () => {
    return db
      .query<{ id: number; name: string; muscle_group: string | null }, []>(
        `SELECT * FROM exercises ORDER BY name ASC`
      )
      .all();
  })

  // Create or get exercise
  .post(
    "/api/exercises",
    ({ body }) => {
      const { name, muscle_group } = body;
      db.run(`INSERT OR IGNORE INTO exercises (name, muscle_group) VALUES (?, ?)`, [
        name,
        muscle_group ?? null,
      ]);
      return db
        .query<{ id: number; name: string; muscle_group: string | null }, [string]>(
          `SELECT * FROM exercises WHERE name = ?`
        )
        .get(name);
    },
    {
      body: t.Object({
        name: t.String(),
        muscle_group: t.Optional(t.String()),
      }),
    }
  )

  // Get exercise progress (weight over time for chart)
  .get(
    "/api/exercises/:id/progress",
    ({ params }) => {
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
        .all(parseInt(params.id, 10));
    },
    { params: t.Object({ id: t.String() }) }
  )

  // List sessions (most recent first)
  .get("/api/sessions", () => {
    const sessions = db
      .query<{ id: number; date: string; notes: string | null; created_at: string }, []>(
        `SELECT * FROM workout_sessions ORDER BY date DESC LIMIT 20`
      )
      .all();

    return sessions.map((s) => {
      const sets = db
        .query<
          {
            exercise_name: string;
            reps: number;
            weight_kg: number;
            is_pr: number;
            set_number: number;
          },
          [number]
        >(
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
  })

  // Create session
  .post(
    "/api/sessions",
    ({ body }) => {
      const date = body.date ?? new Date().toISOString().split("T")[0];
      const result = db
        .query<{ id: number }, [string, string | null]>(
          `INSERT INTO workout_sessions (date, notes) VALUES (?, ?) RETURNING id`
        )
        .get(date, body.notes ?? null);
      return db
        .query<{ id: number; date: string; notes: string | null }, [number]>(
          `SELECT * FROM workout_sessions WHERE id = ?`
        )
        .get(result!.id);
    },
    {
      body: t.Object({
        date: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )

  // Delete session
  .delete(
    "/api/sessions/:id",
    ({ params }) => {
      db.run(`DELETE FROM workout_sessions WHERE id = ?`, [parseInt(params.id, 10)]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Add sets to a session
  .post(
    "/api/sessions/:id/sets",
    ({ params, body }) => {
      const sessionId = parseInt(params.id, 10);
      const { exercise_name, muscle_group, sets } = body;

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
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        exercise_name: t.String(),
        muscle_group: t.Optional(t.String()),
        sets: t.Array(
          t.Object({
            reps: t.Number(),
            weight_kg: t.Number(),
          })
        ),
      }),
    }
  )

  // Delete a set
  .delete(
    "/api/sessions/:id/sets/:setId",
    ({ params }) => {
      db.run(`DELETE FROM workout_sets WHERE id = ? AND session_id = ?`, [
        parseInt(params.setId, 10),
        parseInt(params.id, 10),
      ]);
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), setId: t.String() }) }
  );
