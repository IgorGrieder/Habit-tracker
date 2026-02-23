import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";

export async function nutritionRoutes(app: FastifyInstance) {
  // Get today's or a specific date's log
  app.get<{ Querystring: { date?: string } }>("/api/nutrition", (req) => {
    const date = req.query.date ?? new Date().toISOString().split("T")[0];
    const row = db
      .query<{ id: number; date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; notes: string | null }, [string]>(
        `SELECT * FROM nutrition_logs WHERE date = ?`
      )
      .get(date);
    return row ?? { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: null };
  });

  // Get last 7 days
  app.get("/api/nutrition/week", () => {
    const result: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
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
      result.push(row ? { date, ...row } : { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    }
    return result;
  });

  // Upsert a day's nutrition
  app.put<{
    Params: { date: string };
    Body: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; notes?: string };
  }>(
    "/api/nutrition/:date",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            notes: { type: "string" },
          },
        },
      },
    },
    (req, reply) => {
      const { date } = req.params;
      const { calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, notes } = req.body;
      db.run(
        `INSERT INTO nutrition_logs (date, calories, protein_g, carbs_g, fat_g, notes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET
           calories = excluded.calories,
           protein_g = excluded.protein_g,
           carbs_g = excluded.carbs_g,
           fat_g = excluded.fat_g,
           notes = excluded.notes`,
        [date, calories, protein_g, carbs_g, fat_g, notes ?? null]
      );
      reply.send({ ok: true });
    }
  );
}
