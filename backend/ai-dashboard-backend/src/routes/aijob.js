/**
 * @openapi
 * /api/ai/jobs:
 *   post:
 *     summary: Create a new AI Job
 *     tags: [AI Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dataset:
 *                 type: object
 *               type:
 *                 type: string
 *                 enum: [analysis, insights, patterns, question]
 *     responses:
 *       200:
 *         description: Job created
 *
 * /api/ai/jobs/{jobId}:
 *   get:
 *     summary: Get AI Job status & result
 *     tags: [AI Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 */

import express from "express";
import { createAIJob, getAIJob } from "../controllers/aijobController.js";

const router = express.Router();

// Create new AI job
router.post("/", createAIJob);

// Get job status/result
router.get("/:jobId", getAIJob);

export default router;
