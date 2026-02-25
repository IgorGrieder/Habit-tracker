const BASE = "/api";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Dashboard
export const getDashboard = () => req<DashboardData>("/dashboard");

// Habits
export const getHabits = () => req<Habit[]>("/habits");
export const createHabit = (body: {
  name: string;
  color: string;
  icon: string;
  why?: string;
  schedule?: string;
}) => req<Habit>("/habits", { method: "POST", body: JSON.stringify(body) });
export const deleteHabit = (id: string) =>
  req<{ ok: boolean }>(`/habits/${id}`, { method: "DELETE" });
export const updateHabitWhy = (id: string, why: string) =>
  req<{ ok: boolean }>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify({ why }) });
export const updateHabitSchedule = (id: string, schedule: string) =>
  req<{ ok: boolean }>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify({ schedule }) });
export const completeHabit = (id: string) =>
  req<{ ok: boolean }>(`/habits/${id}/complete`, { method: "POST" });
export const uncompleteHabit = (id: string) =>
  req<{ ok: boolean }>(`/habits/${id}/complete`, { method: "DELETE" });
export const getHabitHistory = (id: string, days = 28) =>
  req<{ date: string; completed: boolean; scheduled: boolean }[]>(
    `/habits/${id}/history?days=${days}`
  );
export const getHabitsCalendar = (days = 28) =>
  req<{ date: string; completed: number; total: number; pct: number }[]>(
    `/habits/calendar?days=${days}`
  );

// Workouts
export const getSessions = () => req<WorkoutSession[]>("/sessions");
export const createSession = (body: { date?: string; notes?: string }) =>
  req<{ id: string; date: string; notes: string | null }>("/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
export const deleteSession = (id: string) =>
  req<{ ok: boolean }>(`/sessions/${id}`, { method: "DELETE" });
export const addSets = (
  sessionId: string,
  body: { exercise_name: string; muscle_group?: string; sets: { reps: number; weight_kg: number }[] }
) =>
  req<{ exercise_name: string; sets: WorkoutSet[] }>(`/sessions/${sessionId}/sets`, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const deleteSet = (sessionId: string, setId: string) =>
  req<{ ok: boolean }>(`/sessions/${sessionId}/sets/${setId}`, { method: "DELETE" });
export const getExercises = () =>
  req<{ id: string; name: string; muscle_group: string | null }[]>("/exercises");
export const getExerciseProgress = (id: string) =>
  req<{ date: string; max_weight: number; total_reps: number }[]>(`/exercises/${id}/progress`);

// Goals
export const getGoals = () => req<Goal[]>("/goals");
export const createGoal = (body: { title: string; description?: string; target_date?: string }) =>
  req<Goal>("/goals", { method: "POST", body: JSON.stringify(body) });
export const updateGoal = (
  id: string,
  body: { title?: string; description?: string; target_date?: string; status?: string }
) => req<{ ok: boolean }>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteGoal = (id: string) =>
  req<{ ok: boolean }>(`/goals/${id}`, { method: "DELETE" });
export const addMilestone = (goalId: string, title: string) =>
  req<Milestone>(`/goals/${goalId}/milestones`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
export const toggleMilestone = (goalId: string, milestoneId: string) =>
  req<{ ok: boolean }>(`/goals/${goalId}/milestones/${milestoneId}`, { method: "PATCH" });
export const deleteMilestone = (goalId: string, milestoneId: string) =>
  req<{ ok: boolean }>(`/goals/${goalId}/milestones/${milestoneId}`, { method: "DELETE" });

// Achievements
export const getAchievements = () => req<AchievementResult[]>("/achievements");

// Recap
export const getRecap = () => req<RecapData>("/recap");

// Nutrition
export const getNutrition = (date?: string) =>
  req<NutritionLog>(`/nutrition${date ? `?date=${date}` : ""}`);
export const getNutritionWeek = () =>
  req<{ date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]>(
    "/nutrition/week"
  );
export const saveNutrition = (date: string, body: Partial<NutritionLog>) =>
  req<{ ok: boolean }>(`/nutrition/${date}`, { method: "PUT", body: JSON.stringify(body) });

// Types
export interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string;
  why: string | null;
  schedule: string;
  scheduledToday: boolean;
  created_at: string;
  completedToday: boolean;
  streak: number;
}

export interface WorkoutSet {
  id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  is_pr: boolean;
}

export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
  hasPR: boolean;
}

export interface WorkoutSession {
  id: string;
  date: string;
  notes: string | null;
  exercises: WorkoutExercise[];
  totalSets: number;
  prCount: number;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  completed_at: string | null;
  position: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  created_at: string;
  milestones: Milestone[];
  progress: number;
}

export interface NutritionLog {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
}

export interface AchievementResult {
  id: string;
  title: string;
  desc: string;
  icon: string;
  category: "milestone" | "streak" | "consistency";
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface RecapDayData {
  date: string;
  completed: number;
  total: number;
  pct: number;
}

export interface RecapData {
  thisWeek: {
    habitPct: number;
    perfectDays: number;
    totalCompletions: number;
    daysActive: number;
    perDay: RecapDayData[];
    dateRange: { start: string; end: string };
  };
  lastWeek: {
    habitPct: number;
    perfectDays: number;
    totalCompletions: number;
    daysActive: number;
  };
  trend: "up" | "down" | "same";
  topStreak: { name: string; icon: string; streak: number } | null;
  habitBreakdown: { name: string; icon: string; color: string; completions: number; rate: number }[];
}

export interface DashboardData {
  today: string;
  habits: (Habit & { completedToday: boolean; streak: number })[];
  habitsDoneToday: number;
  totalHabits: number;
  lastWorkout: {
    id: string;
    date: string;
    notes: string | null;
    exerciseNames: string[];
    totalSets: number;
    prCount: number;
  } | null;
  goals: {
    id: string;
    title: string;
    status: string;
    target_date: string | null;
    progress: number;
    totalMilestones: number;
    doneMilestones: number;
  }[];
  nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  weeklyData: { date: string; completed: number; total: number }[];
}
