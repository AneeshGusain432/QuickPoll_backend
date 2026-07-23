import express from "express";
import type { Router } from "express";
import * as pollController from "./pollController.js";
import { authenticate } from "../../common/middleware/authMiddleware.js";

export const pollRouter: Router = express.Router();

pollRouter.post(
  "/create/poll",
  authenticate,
  pollController.createpollController,
);
pollRouter.get(
  "/get/poll/:pollId",
  authenticate,
  pollController.getPollController,
);
pollRouter.get(
  "/get/public/poll/:pollId",
  pollController.getpublicPollController,
);
pollRouter.put("/publish/poll/:pollId", authenticate, pollController.publishPollController);
pollRouter.delete("/delete/poll/:pollId", authenticate, pollController.deletePollController);
pollRouter.post("/submit/poll/response/:pollId", pollController.submitResponseController);
pollRouter.get("/get/poll/analytics/:pollId", authenticate, pollController.getPollAnalyticsController);
pollRouter.get("/get/polls/list", authenticate, pollController.getPollsListController);
pollRouter.put("/live/poll/:pollId", authenticate, pollController.livePollController)
pollRouter.get("/get/live/poll/counts", pollController.getLivePollCountController)