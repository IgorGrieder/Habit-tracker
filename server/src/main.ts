import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { connectDB } from "./db/mongoose";

async function bootstrap() {
  await connectDB();
  console.log("Connected to MongoDB Atlas");

  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: "http://localhost:5173" });

  await app.listen(3000);
  console.log("ATLAS server running on http://localhost:3000");
}

void bootstrap();
