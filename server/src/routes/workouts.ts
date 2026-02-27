import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ExerciseModel, SessionModel, Types } from "../db/mongoose";
import { checkAndMarkPR, todayBR } from "../db/index";

interface CreateExerciseBody {
  name: string;
  muscle_group?: string;
}

interface CreateSessionBody {
  date?: string;
  notes?: string;
}

interface AddSetsBody {
  exercise_name: string;
  muscle_group?: string;
  sets: { reps: number; weight_kg: number }[];
}

@Controller("api")
export class WorkoutsController {
  @Get("exercises")
  async getExercises() {
    const exercises = await ExerciseModel.find().sort({ name: 1 }).lean();
    return exercises.map((e) => ({
      id: e._id.toString(),
      name: e.name,
      muscle_group: e.muscle_group ?? null,
    }));
  }

  @Post("exercises")
  async createExercise(@Body() body: CreateExerciseBody) {
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
  }

  @Get("exercises/:id/progress")
  async getExerciseProgress(@Param("id") id: string) {
    const exercise = await ExerciseModel.findById(id).lean();
    if (!exercise) {
      return [];
    }

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
  }

  @Get("sessions")
  async getSessions() {
    const sessions = await SessionModel.find().sort({ date: -1 }).limit(20).lean();

    return sessions.map((s) => {
      const exercises: {
        name: string;
        sets: { id: string; set_number: number; reps: number; weight_kg: number; is_pr: boolean }[];
        hasPR: boolean;
      }[] = [];

      for (const ex of s.exercises ?? []) {
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
  }

  @Post("sessions")
  async createSession(@Body() body: CreateSessionBody) {
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
  }

  @Delete("sessions/:id")
  async deleteSession(@Param("id") id: string) {
    await SessionModel.findByIdAndDelete(id);
    return { ok: true };
  }

  @Post("sessions/:id/sets")
  async addSets(@Param("id") id: string, @Body() body: AddSetsBody) {
    const sessionId = new Types.ObjectId(id);
    const { exercise_name, muscle_group, sets } = body;

    await ExerciseModel.updateOne(
      { name: exercise_name },
      { $setOnInsert: { name: exercise_name, muscle_group: muscle_group ?? null } },
      { upsert: true }
    );

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
  }

  @Delete("sessions/:id/sets/:setId")
  async deleteSet(@Param("id") id: string, @Param("setId") setId: string) {
    await SessionModel.updateOne(
      { _id: id },
      { $pull: { "exercises.$[].sets": { _id: new Types.ObjectId(setId) } } } as never
    );

    return { ok: true };
  }
}
