import AIJob from "../models/AIJob.js";

import {
    runAnalysis,
    generateInsights,
    detectPatterns,
    askQuestion,
} from "../services/aiService.js";

export async function processAIJob(jobId) {
    const job = await AIJob.findById(jobId);
    if (!job) return;

    try {
        job.status = "running";
        await job.save();

        let result;

        switch (job.type) {
            case "analysis":
                result = await runAnalysis(job.dataset);
                break;
            case "insights":
                result = await generateInsights(job.dataset);
                break;
            case "patterns":
                result = await detectPatterns(job.dataset);
                break;
            case "question":
                result = await askQuestion(job.dataset.question, job.dataset.context);
                break;
            default:
                throw new Error("Unsupported job type: " + job.type);
        }

        job.status = "completed";
        job.result = result;
        await job.save();
    } catch (err) {
        job.status = "failed";
        job.error = err.message || "Unknown error";
        await job.save();
    }
}
