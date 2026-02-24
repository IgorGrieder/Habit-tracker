import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { achievementsRoutes } from "./routes/achievements.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { goalsRoutes } from "./routes/goals.js";
import { habitsRoutes } from "./routes/habits.js";
import { nutritionRoutes } from "./routes/nutrition.js";
import { recapRoutes } from "./routes/recap.js";
import { workoutsRoutes } from "./routes/workouts.js";

const app = new Elysia()
  .use(cors({ origin: "http://localhost:5173" }))
  .use(habitsRoutes)
  .use(workoutsRoutes)
  .use(goalsRoutes)
  .use(nutritionRoutes)
  .use(dashboardRoutes)
  .use(achievementsRoutes)
  .use(recapRoutes)
  .get("/health", () => ({ status: "ok" }))
  .listen(3000);

console.log("ATLAS server running on http://localhost:3000");

export type App = typeof app;
