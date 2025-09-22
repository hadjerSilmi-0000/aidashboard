import AIJob from "../models/AIJob.js";
import { processAIJob } from "../jobs/aiJobProcessor.js";

// Create job
export async function createAIJob(req, res) {
    try {
        const { dataset, type } = req.body;
        if (!dataset || !type) {
            return res.status(400).json({ error: "dataset and type are required" });
        }

        const job = await AIJob.create({ dataset, type, status: "pending" });

        // Process job asynchronously
        processAIJob(job._id);

        res.json({ jobId: job._id, status: job.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Get job status/result
export async function getAIJob(req, res) {
    try {
        const { jobId } = req.params;
        const job = await AIJob.findById(jobId);

        if (!job) return res.status(404).json({ error: "Job not found" });

        res.json(job);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
