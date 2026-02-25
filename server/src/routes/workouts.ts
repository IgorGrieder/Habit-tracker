import { Elysia, t } from "elysia";
import { ExerciseModel, SessionModel, Types } from "../db/mongoose.js";
import { checkAndMarkPR, todayBR } from "../db/index.js";

export const workoutsRoutes = new Elysia()
  // List exercises
  .get("/api/exercises", async () => {
    const exercises = await ExerciseModel.find().sort({ name: 1 }).lean();
    return exercises.map((e) => ({
      id: e._id.toString(),
      name: e.name,
      muscle_group: e.muscle_group ?? null,
    }));
  })

  // Create or get exercise
  .post(
    "/api/exercises",
    async ({ body }) => {
      const { name, muscle_group } = body;
      await ExerciseModel.updateOne(
        { name },
        { $setOnInsert: { name, muscle_group: muscle_group ?? null } },
        { upsert: true }
      );
      const exercise = await ExerciseModel.findOne({ name }).lean();
      return {
        id: exercise!._id.toString(),
        name: exercise!.name,
        muscle_group: exercise!.muscle_group ?? null,
      };
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
    async ({ params }) => {
      const exercise = await ExerciseModel.findById(params.id).lean();
      if (!exercise) return [];

      const rows = await SessionModel.aggregate([
        { $unwind: "$exercises" },
        { $match: { "exercises.name": exercise.name } },
        { $unwind: "$exercises.sets" },
        {
          $group: {
            _id: "$date",
            max_weight: { $max: "$exercises.sets.weight_kg" },
            total_reps: { $sum: "$exercises.sets.reps" },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]);

      return rows.map((r) => ({
        date: r._id as string,
        max_weight: r.max_weight as number,
        total_reps: r.total_reps as number,
      }));
    },
    { params: t.Object({ id: t.String() }) }
  )

  // List sessions (most recent first)
  .get("/api/sessions", async () => {
    const sessions = await SessionModel.find().sort({ date: -1 }).limit(20).lean();

    return sessions.map((s) => {
      const exercises: { name: string; sets: { id: string; set_number: number; reps: number; weight_kg: number; is_pr: boolean }[]; hasPR: boolean }[] = [];

      for (const ex of (s.exercises ?? [])) {
        const sets = (ex.sets ?? []).map((set) => ({
          id: set._id.toString(),
          set_number: set.set_number,
          reps: set.reps,
          weight_kg: set.weight_kg,
          is_pr: !!set.is_pr,
        }));
        exercises.push({
          name: ex.name,
          sets,
          hasPR: sets.some((st) => st.is_pr),
        });
      }

      const allSets = exercises.flatMap((e) => e.sets);
      return {
        id: s._id.toString(),
        date: s.date,
        notes: s.notes ?? null,
        created_at: s.created_at,
        exercises,
        totalSets: allSets.length,
        prCount: allSets.filter((st) => st.is_pr).length,
      };
    });
  })

  // Create session
  .post(
    "/api/sessions",
    async ({ body }) => {
      const date = body.date ?? todayBR();
      const created_at = new Date().toISOString();
      const doc = { date, notes: body.notes ?? null, created_at, exercises: [] };
      const result = await SessionModel.create(doc);
      return {
        id: result._id.toString(),
        date,
        notes: body.notes ?? null,
        created_at,
      };
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
    async ({ params }) => {
      await SessionModel.findByIdAndDelete(params.id);
      return { ok: true };
    },
    { params: t.Object({ id: t.String() }) }
  )

  // Add sets to a session
  .post(
    "/api/sessions/:id/sets",
    async ({ params, body }) => {
      const sessionId = new Types.ObjectId(params.id);
      const { exercise_name, muscle_group, sets } = body;

      // Upsert exercise
      await ExerciseModel.updateOne(
        { name: exercise_name },
        { $setOnInsert: { name: exercise_name, muscle_group: muscle_group ?? null } },
        { upsert: true }
      );

      // Build set objects with new ObjectIds
      const insertedSets = await Promise.all(
        sets.map(async (set, i) => {
          const isPR = await checkAndMarkPR(sessionId, exercise_name, set.reps, set.weight_kg);
          return {
            _id: new Types.ObjectId(),
            set_number: i + 1,
            reps: set.reps,
            weight_kg: set.weight_kg,
            is_pr: isPR,
          };
        })
      );

      // Push exercise entry into session document
      await SessionModel.updateOne(
        { _id: sessionId },
        {
          $push: {
            exercises: {
              name: exercise_name,
              muscle_group: muscle_group ?? null,
              sets: insertedSets,
            },
          },
        }
      );

      return {
        exercise_name,
        sets: insertedSets.map((s) => ({
          id: s._id.toString(),
          set_number: s.set_number,
          reps: s.reps,
          weight_kg: s.weight_kg,
          is_pr: s.is_pr,
        })),
      };
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
    async ({ params }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await SessionModel.updateOne(
        { _id: params.id },
        { $pull: { "exercises.$[].sets": { _id: new Types.ObjectId(params.setId) } } } as any
      );
      return { ok: true };
    },
    { params: t.Object({ id: t.String(), setId: t.String() }) }
  );
