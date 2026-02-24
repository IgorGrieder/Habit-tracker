import { Elysia, t } from "elysia";
import { db } from "../db/index.js";

export const nutritionRoutes = new Elysia()
  // Get today's or a specific date's log
  .get(
    "/api/nutrition",
    ({ query }) => {
      const date = query.date ?? new Date().toISOString().split("T")[0];
      const row = db
        .query<
          {
            id: number;
            date: string;
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
            notes: string | null;
          },
          [string]
        >(`SELECT * FROM nutrition_logs WHERE date = ?`)
        .get(date);
      return row ?? { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: null };
    },
    { query: t.Object({ date: t.Optional(t.String()) }) }
  )

  // Get last 7 days
  .get("/api/nutrition/week", () => {
    const result: {
      date: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }[] = [];
    const cur = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(cur);
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      const row = db
        .query<{ calories: number; protein_g: number; carbs_g: number; fat_g: number }, [string]>(
          `SELECT calories, protein_g, carbs_g, fat_g FROM nutrition_logs WHERE date = ?`
        )
        .get(date);
      result.push(
        row ? { date, ...row } : { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );
    }
    return result;
  })

  // Upsert a day's nutrition
  .put(
    "/api/nutrition/:date",
    ({ params, body }) => {
      const { calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, notes } = body;
      db.run(
        `INSERT INTO nutrition_logs (date, calories, protein_g, carbs_g, fat_g, notes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           calories = excluded.calories,
           protein_g = excluded.protein_g,
           carbs_g = excluded.carbs_g,
           fat_g = excluded.fat_g,
           notes = excluded.notes`,
        [params.date, calories, protein_g, carbs_g, fat_g, notes ?? null]
      );
      return { ok: true };
    },
    {
      params: t.Object({ date: t.String() }),
      body: t.Object({
        calories: t.Optional(t.Number()),
        protein_g: t.Optional(t.Number()),
        carbs_g: t.Optional(t.Number()),
        fat_g: t.Optional(t.Number()),
        notes: t.Optional(t.String()),
      }),
    }
  );
