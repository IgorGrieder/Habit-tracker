import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { HabitModel } from "../db/mongoose";
import { dateBR, getDayOfWeekForDate, getStreak, parseSchedule, todayBR } from "../db/index";

interface CreateHabitBody {
  name: string;
  color?: string;
  icon?: string;
  why?: string;
  schedule?: string;
}

interface UpdateHabitBody {
  why?: string;
  schedule?: string;
}

@Controller("api/habits")
export class HabitsController {
  @Get()
  async getHabits() {
    const today = todayBR();
    const todayDow = getDayOfWeekForDate(today);
    const habits = await HabitModel.find().sort({ created_at: 1 }).lean();

    return habits.map((h) => {
      const completions: string[] = h.completions ?? [];
      const schedule = h.schedule ?? "0,1,2,3,4,5,6";
      const scheduledDays = parseSchedule(schedule);

      return {
        id: h._id.toString(),
        name: h.name,
        color: h.color,
        icon: h.icon,
        why: h.why ?? null,
        schedule,
        created_at: h.created_at,
        completedToday: completions.includes(today),
        streak: getStreak(schedule, completions),
        scheduledToday: scheduledDays.has(todayDow),
      };
    });
  }

  @Get("calendar")
  async getHabitsCalendar(@Query("days") days?: string) {
    const totalDays = Number.parseInt(days ?? "28", 10);
    const habits = await HabitModel.find({}, "schedule completions").lean();

    const habitSchedules = habits.map((h) => ({
      scheduleDays: parseSchedule(h.schedule ?? "0,1,2,3,4,5,6"),
      completions: new Set<string>(h.completions ?? []),
    }));

    const result: { date: string; completed: number; total: number; pct: number }[] = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = dateBR(i);
      const dow = getDayOfWeekForDate(date);

      const scheduled = habitSchedules.filter((h) => h.scheduleDays.has(dow));
      const total = scheduled.length;

      if (total === 0) {
        result.push({ date, completed: 0, total: 0, pct: 0 });
        continue;
      }

      const completed = scheduled.filter((h) => h.completions.has(date)).length;
      result.push({
        date,
        completed,
        total,
        pct: Math.round((completed / total) * 100),
      });
    }

    return result;
  }

  @Get(":id/history")
  async getHabitHistory(@Param("id") id: string, @Query("days") days?: string) {
    const totalDays = Number.parseInt(days ?? "28", 10);

    const habit = await HabitModel.findById(id).lean();
    const scheduledDays = parseSchedule(habit?.schedule ?? "0,1,2,3,4,5,6");
    const dateSet = new Set<string>(habit?.completions ?? []);

    const result: { date: string; completed: boolean; scheduled: boolean }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = dateBR(i);
      const dow = getDayOfWeekForDate(d);
      result.unshift({ date: d, completed: dateSet.has(d), scheduled: scheduledDays.has(dow) });
    }

    return result;
  }

  @Post()
  async createHabit(@Body() body: CreateHabitBody) {
    const { name, color = "#e8b04b", icon = "⚡", why, schedule = "0,1,2,3,4,5,6" } = body;
    const created_at = todayBR();
    const doc = {
      name,
      color,
      icon,
      why: why ?? null,
      schedule,
      created_at,
      completions: [],
    };

    const result = await HabitModel.create(doc);

    const today = todayBR();
    const todayDow = getDayOfWeekForDate(today);
    const scheduledDays = parseSchedule(schedule);

    return {
      id: result._id.toString(),
      name,
      color,
      icon,
      why: why ?? null,
      schedule,
      created_at,
      completedToday: false,
      streak: 0,
      scheduledToday: scheduledDays.has(todayDow),
    };
  }

  @Patch(":id")
  async updateHabit(@Param("id") id: string, @Body() body: UpdateHabitBody) {
    const updates: Record<string, unknown> = {};

    if (body.why !== undefined) {
      updates.why = body.why || null;
    }

    if (body.schedule !== undefined) {
      updates.schedule = body.schedule;
    }

    if (Object.keys(updates).length > 0) {
      await HabitModel.updateOne({ _id: id }, { $set: updates });
    }

    return { ok: true };
  }

  @Delete(":id")
  async deleteHabit(@Param("id") id: string) {
    await HabitModel.findByIdAndDelete(id);
    return { ok: true };
  }

  @Post(":id/complete")
  async completeHabit(@Param("id") id: string) {
    const today = todayBR();
    await HabitModel.updateOne({ _id: id }, { $addToSet: { completions: today } });
    return { ok: true };
  }

  @Delete(":id/complete")
  async uncompleteHabit(@Param("id") id: string) {
    const today = todayBR();
    await HabitModel.updateOne({ _id: id }, { $pull: { completions: today } });
    return { ok: true };
  }
}
