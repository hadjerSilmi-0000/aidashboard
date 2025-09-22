import { createQueue, createWorker, createQueueEvents } from "./index.js";
import { processFileJob } from "../workers/fileProcessor.js";

export const fileQueue = createQueue("file-processing"); // ✅ Queue instance

// Worker (handles jobs)
createWorker("file-processing", processFileJob, { concurrency: 2 });

// Events (progress, completion, failed)
const fileQueueEvents = createQueueEvents("file-processing");

fileQueueEvents.on("completed", ({ jobId }) => {
    console.log(`✅ Job ${jobId} completed`);
});

fileQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`❌ Job ${jobId} failed: ${failedReason}`);
});
