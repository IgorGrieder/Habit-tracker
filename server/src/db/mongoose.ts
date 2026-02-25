import mongoose, { Schema, model, Types } from "mongoose";

export { Types };

export const connectDB = () => mongoose.connect(process.env.MONGO_URI!);

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface IHabit {
  _id: Types.ObjectId;
  name: string;
  color: string;
  icon: string;
  why: string | null;
  schedule: string;
  created_at: string;
  completions: string[];
}

export interface IWorkoutSet {
  _id: Types.ObjectId;
  set_number: number;
  reps: number;
  weight_kg: number;
  is_pr: boolean;
}

export interface IWorkoutExercise {
  name: string;
  muscle_group: string | null;
  sets: IWorkoutSet[];
}

export interface IWorkoutSession {
  _id: Types.ObjectId;
  date: string;
  notes: string | null;
  created_at: string;
  exercises: IWorkoutExercise[];
}

export interface IExercise {
  _id: Types.ObjectId;
  name: string;
  muscle_group: string | null;
}

export interface IMilestone {
  _id: Types.ObjectId;
  title: string;
  completed_at: string | null;
  position: number;
}

export interface IGoal {
  _id: Types.ObjectId;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  created_at: string;
  milestones: IMilestone[];
}

export interface INutritionLog {
  _id: Types.ObjectId;
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
}

export interface IAchievementUnlock {
  _id: string;
  unlocked_at: string;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const WorkoutSetSchema = new Schema<IWorkoutSet>({
  set_number: Number,
  reps: Number,
  weight_kg: Number,
  is_pr: { type: Boolean, default: false },
});

// _id: false — exercises within a session don't need their own ID
const WorkoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    name: String,
    muscle_group: { type: String, default: null },
    sets: [WorkoutSetSchema],
  },
  { _id: false }
);

// IMilestone keeps _id (used by toggle/delete via $pull filter)
const MilestoneSchema = new Schema<IMilestone>({
  title: String,
  completed_at: { type: String, default: null },
  position: Number,
});

const HabitSchema = new Schema<IHabit>({
  name: { type: String, required: true },
  color: { type: String, default: "#e8b04b" },
  icon: { type: String, default: "⚡" },
  why: { type: String, default: null },
  schedule: { type: String, default: "0,1,2,3,4,5,6" },
  created_at: String,
  completions: [{ type: String }],
});

const ExerciseSchema = new Schema<IExercise>({
  name: { type: String, required: true, unique: true },
  muscle_group: { type: String, default: null },
});

const SessionSchema = new Schema<IWorkoutSession>({
  date: { type: String, required: true },
  notes: { type: String, default: null },
  created_at: String,
  exercises: [WorkoutExerciseSchema],
});

const GoalSchema = new Schema<IGoal>({
  title: { type: String, required: true },
  description: { type: String, default: null },
  target_date: { type: String, default: null },
  status: { type: String, default: "active" },
  created_at: String,
  milestones: [MilestoneSchema],
});

const NutritionSchema = new Schema<INutritionLog>({
  date: { type: String, required: true, unique: true },
  calories: { type: Number, default: 0 },
  protein_g: { type: Number, default: 0 },
  carbs_g: { type: Number, default: 0 },
  fat_g: { type: Number, default: 0 },
  notes: { type: String, default: null },
});

// _id is a plain string (the achievement ID like "first_step")
const AchievementUnlockSchema = new Schema<IAchievementUnlock>({
  _id: { type: String },
  unlocked_at: String,
});

// ─── Models (guard against hot-reload double-registration) ────────────────────

export const HabitModel =
  (mongoose.models["Habit"] as mongoose.Model<IHabit>) ??
  model<IHabit>("Habit", HabitSchema, "habits");

export const ExerciseModel =
  (mongoose.models["Exercise"] as mongoose.Model<IExercise>) ??
  model<IExercise>("Exercise", ExerciseSchema, "exercises");

export const SessionModel =
  (mongoose.models["WorkoutSession"] as mongoose.Model<IWorkoutSession>) ??
  model<IWorkoutSession>("WorkoutSession", SessionSchema, "workout_sessions");

export const GoalModel =
  (mongoose.models["Goal"] as mongoose.Model<IGoal>) ??
  model<IGoal>("Goal", GoalSchema, "goals");

export const NutritionModel =
  (mongoose.models["NutritionLog"] as mongoose.Model<INutritionLog>) ??
  model<INutritionLog>("NutritionLog", NutritionSchema, "nutrition_logs");

export const AchievementUnlockModel =
  (mongoose.models["AchievementUnlock"] as mongoose.Model<IAchievementUnlock>) ??
  model<IAchievementUnlock>("AchievementUnlock", AchievementUnlockSchema, "achievement_unlocks");
