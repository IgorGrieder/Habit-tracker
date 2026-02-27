import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { NutritionModel } from "../db/mongoose";
import { dateBR, todayBR } from "../db/index";

interface SaveNutritionBody {
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  notes?: string;
}

@Controller("api/nutrition")
export class NutritionController {
  @Get()
  async getNutrition(@Query("date") date?: string) {
    const selectedDate = date ?? todayBR();
    const row = await NutritionModel.findOne({ date: selectedDate }).lean();

    if (!row) {
      return {
        date: selectedDate,
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        notes: null,
      };
    }

    return {
      date: row.date,
      calories: row.calories ?? 0,
      protein_g: row.protein_g ?? 0,
      carbs_g: row.carbs_g ?? 0,
      fat_g: row.fat_g ?? 0,
      notes: row.notes ?? null,
    };
  }

  @Get("week")
  async getNutritionWeek() {
    const dates = Array.from({ length: 7 }, (_, i) => dateBR(6 - i));
    const rows = await NutritionModel.find({ date: { $in: dates } }).lean();
    const rowMap = new Map(rows.map((r) => [r.date, r]));

    return dates.map((date) => {
      const row = rowMap.get(date);
      return row
        ? {
            date,
            calories: row.calories ?? 0,
            protein_g: row.protein_g ?? 0,
            carbs_g: row.carbs_g ?? 0,
            fat_g: row.fat_g ?? 0,
          }
        : {
            date,
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
          };
    });
  }

  @Put(":date")
  async saveNutrition(@Param("date") date: string, @Body() body: SaveNutritionBody) {
    const { calories = 0, protein_g = 0, carbs_g = 0, fat_g = 0, notes } = body;

    await NutritionModel.findOneAndUpdate(
      { date },
      {
        $setOnInsert: { date },
        $set: {
          calories,
          protein_g,
          carbs_g,
          fat_g,
          notes: notes ?? null,
        },
      },
      { upsert: true }
    );

    return { ok: true };
  }
}
