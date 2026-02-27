import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AchievementsController } from "./routes/achievements";
import { DashboardController } from "./routes/dashboard";
import { GoalsController } from "./routes/goals";
import { HabitsController } from "./routes/habits";
import { NutritionController } from "./routes/nutrition";
import { RecapController } from "./routes/recap";
import { WorkoutsController } from "./routes/workouts";

@Module({
  controllers: [
    HealthController,
    HabitsController,
    WorkoutsController,
    GoalsController,
    NutritionController,
    DashboardController,
    AchievementsController,
    RecapController,
  ],
})
export class AppModule {}
