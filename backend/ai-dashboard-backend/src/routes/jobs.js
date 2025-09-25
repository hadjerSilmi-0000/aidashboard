import express from "express";
import requireAuth from "../middleware/Auth/requireAuth.js";
import { requireAdmin } from "../middleware/Auth/roles.js";
import {
    getJobStatusController,
    cancelJobController,
    getQueueStatsController,
} from "../controllers/jobController.js";
import { enqueueFileJob } from "../services/jobService.js";

const router = express.Router();

// Enqueue a new file job (admin + manager)
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

// Get job status by ID (admin + manager)
router.get("/:id/status", requireAuth, getJobStatusController);

// Cancel job by ID (admin only)
router.delete("/:id", requireAuth, requireAdmin, cancelJobController);

// Get queue statistics (admin only)
router.get("/stats/all", requireAuth, requireAdmin, getQueueStatsController);

export default router;
