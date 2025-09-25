import express from "express";
import { createAIJob, getAIJob } from "../controllers/aijobController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";

const router = express.Router();

// Create new AI job (admin + manager)
router.post("/", requireAuth, createAIJob);

// Get job status/result (admin + manager)
router.get("/:jobId", requireAuth, getAIJob);

export default router;
