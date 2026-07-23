import "dotenv/config";
import express from "express";
import type { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { authRouter } from "./module/auth/authRoutes.js";
import { errorHandler } from "./common/middleware/errorMiddleware.js";
import { pollRouter } from "./module/poll/pollRoutes.js";


export function createExpressApplication(): Application {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/poll", pollRouter)
  
  app.use(errorHandler);
  return app;
}
