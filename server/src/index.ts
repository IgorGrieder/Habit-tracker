import Fastify from "fastify";
import cors from "@fastify/cors";
import { habitsRoutes } from "./routes/habits.js";
import { workoutsRoutes } from "./routes/workouts.js";
import { goalsRoutes } from "./routes/goals.js";
import { nutritionRoutes } from "./routes/nutrition.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { achievementsRoutes } from "./routes/achievements.js";
import { recapRoutes } from "./routes/recap.js";

const app = Fastify({ logger: false });

await app.register(cors, { origin: "http://localhost:5173" });

await app.register(habitsRoutes);
await app.register(workoutsRoutes);
await app.register(goalsRoutes);
await app.register(nutritionRoutes);
await app.register(dashboardRoutes);
await app.register(achievementsRoutes);
await app.register(recapRoutes);

app.get("/health", () => ({ status: "ok" }));

try {
  await app.listen({ port: 3000, host: "127.0.0.1" });
  console.log("ATLAS server running on http://localhost:3000");
} catch (err) {
  console.error(err);
  process.exit(1);
}
