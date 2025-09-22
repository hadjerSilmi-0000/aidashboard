import express from "express";
import requireAuth from "../middleware/Auth/requireAuth.js";
import {
    getJobStatusController,
    cancelJobController,
    getQueueStatsController,
} from "../controllers/jobController.js";
import { enqueueFileJob } from "../services/jobService.js";

const router = express.Router();

// 🔹 Enqueue a real file job
router.post("/enqueue", requireAuth, async (req, res, next) => {
    try {
        const { fileId } = req.body;
        if (!fileId) {
            return res.status(400).json({ success: false, message: "fileId is required" });
        }

        const job = await enqueueFileJob(fileId);
        res.json({ success: true, message: "Job enqueued", jobId: job.id });
    } catch (err) {
        next(err);
    }
});

// Get job status by ID
router.get("/:id/status", requireAuth, getJobStatusController);

// Cancel job by ID
router.delete("/:id", requireAuth, cancelJobController);

// Get queue statistics
router.get("/stats/all", requireAuth, getQueueStatsController);

export default router;
