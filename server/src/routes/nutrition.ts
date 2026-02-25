import { Elysia, t } from "elysia";
import { NutritionModel } from "../db/mongoose.js";
import { dateBR, todayBR } from "../db/index.js";

export const nutritionRoutes = new Elysia()
  // Get today's or a specific date's log
  .get(
    "/api/nutrition",
    async ({ query }) => {
      const date = query.date ?? todayBR();
      const row = await NutritionModel.findOne({ date }).lean();
      if (!row) return { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, notes: null };
      return {
        date: row.date,
        calories: row.calories ?? 0,
        protein_g: row.protein_g ?? 0,
        carbs_g: row.carbs_g ?? 0,
        fat_g: row.fat_g ?? 0,
        notes: row.notes ?? null,
      };
    },
    { query: t.Object({ date: t.Optional(t.String()) }) }
  )

  // Get last 7 days
  .get("/api/nutrition/week", async () => {
    const dates = Array.from({ length: 7 }, (_, i) => dateBR(6 - i));
    const rows = await NutritionModel.find({ date: { $in: dates } }).lean();
    const rowMap = new Map(rows.map((r) => [r.date, r]));

    return dates.map((date) => {
      const row = rowMap.get(date);
      return row
        ? { date, calories: row.calories ?? 0, protein_g: row.protein_g ?? 0, carbs_g: row.carbs_g ?? 0, fat_g: row.fat_g ?? 0 }
        : { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    });
  })

  // Upsert a day's nutrition
  .put(
    "/api/nutrition/:date",
    async ({ params, body }) => {
      const { calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, notes } = body;
      await NutritionModel.findOneAndUpdate(
        { date: params.date },
        {
          $setOnInsert: { date: params.date },
          $set: { calories, protein_g, carbs_g, fat_g, notes: notes ?? null },
        },
        { upsert: true }
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
