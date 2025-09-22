// src/services/jobService.js
import { fileQueue } from "../queues/fileQueue.js";

/**
 * Enqueue a new file job
 */
export async function enqueueFileJob(fileId) {
    const job = await fileQueue.add("process-file", { fileId }, { attempts: 3, backoff: 5000 });
    return {
        id: job.id,
        name: job.name,
        data: job.data,
        status: job.status,
    };
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId) {
    const job = fileQueue.getJob(parseInt(jobId, 10));
    if (!job) return null;

    return {
        id: job.id,
        state: job.status,
        progress: job.progress ?? 0,
        createdAt: job.createdAt,
        processedAt: job.processedAt,
    };
}

/**
 * Cancel a job by ID
 */
export async function cancelJob(jobId) {
    const job = fileQueue.getJob(parseInt(jobId, 10));
    if (!job) return false;

    // Mark it cancelled (and update in queue)
    job.status = "cancelled";
    return true;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const jobs = fileQueue.getJobs();
    return {
        waiting: jobs.filter((j) => j.status === "waiting").length,
        active: jobs.filter((j) => j.status === "active").length,
        completed: jobs.filter((j) => j.status === "completed").length,
        failed: jobs.filter((j) => j.status === "failed").length,
        cancelled: jobs.filter((j) => j.status === "cancelled").length,
        total: jobs.length,
    };
}
