import { Database } from "bun:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "atlas.db");

export const db = new Database(DB_PATH, { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

db.run(`
  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#e8b04b',
    icon TEXT NOT NULL DEFAULT '⚡',
    created_at TEXT NOT NULL DEFAULT (date('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS habit_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date TEXT NOT NULL,
    UNIQUE(habit_id, completed_date)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    muscle_group TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    set_number INTEGER NOT NULL DEFAULT 1,
    reps INTEGER NOT NULL,
    weight_kg REAL NOT NULL DEFAULT 0,
    is_pr INTEGER NOT NULL DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (date('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS goal_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed_at TEXT,
    position INTEGER NOT NULL DEFAULT 0
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    calories INTEGER NOT NULL DEFAULT 0,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    notes TEXT
  )
`);

try {
  db.run(`ALTER TABLE habits ADD COLUMN why TEXT`);
} catch {
  // column already exists
}

db.run(`
  CREATE TABLE IF NOT EXISTS achievement_unlocks (
    id TEXT PRIMARY KEY,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export function getStreak(habitId: number): number {
  const today = new Date().toISOString().split("T")[0];
  const rows = db
    .query<{ completed_date: string }, [number]>(
      `SELECT completed_date FROM habit_completions
       WHERE habit_id = ? ORDER BY completed_date DESC`
    )
    .all(habitId);

  if (rows.length === 0) return 0;

  const dateSet = new Set(rows.map((r) => r.completed_date));
  let streak = 0;
  const current = new Date(`${today}T12:00:00Z`);

  if (!dateSet.has(today)) {
    current.setUTCDate(current.getUTCDate() - 1);
  }

  while (true) {
    const dateStr = current.toISOString().split("T")[0];
    if (dateSet.has(dateStr)) {
      streak++;
      current.setUTCDate(current.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function checkAndMarkPR(
  sessionId: number,
  exerciseId: number,
  reps: number,
  weightKg: number
): boolean {
  const prev = db
    .query<{ max_weight: number }, [number, number, number]>(
      `SELECT MAX(ws.weight_kg) as max_weight
       FROM workout_sets ws
       JOIN workout_sessions sess ON ws.session_id = sess.id
       WHERE ws.exercise_id = ? AND ws.reps = ? AND ws.session_id != ?`
    )
    .get(exerciseId, reps, sessionId);

  return !prev?.max_weight || weightKg > prev.max_weight;
}
