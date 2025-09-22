import { getJobStatus, cancelJob, getQueueStats } from "../services/jobService.js";

// Get job status
export const getJobStatusController = async (req, res, next) => {
    try {
        const job = await getJobStatus(req.params.id);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }
        res.json({ success: true, job });
    } catch (err) {
        next(err);
    }
};

// Cancel job
export const cancelJobController = async (req, res, next) => {
    try {
        const cancelled = await cancelJob(req.params.id);
        if (!cancelled) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }
        res.json({ success: true, message: "Job cancelled successfully" });
    } catch (err) {
        next(err);
    }
};

// Get queue statistics
export const getQueueStatsController = async (req, res, next) => {
    try {
        const stats = await getQueueStats();
        res.json({ success: true, stats });
    } catch (err) {
        next(err);
    }
};
