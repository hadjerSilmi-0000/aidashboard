// src/queues/index.js - No Redis dependencies
import { EventEmitter } from "events";

console.log("✅ Loading Redis-free queue system...");

// Mock connection object
export const connection = {
    ping: () => Promise.resolve("PONG"),
    get: (key) => Promise.resolve(null),
    set: (key, value) => Promise.resolve("OK"),
    del: (key) => Promise.resolve(1),
};

// In-memory job storage
const jobStorage = new Map();
const queueStorage = new Map();
let globalJobId = 1;

// Simple Queue class - no Redis
class SimpleQueue extends EventEmitter {
    constructor(name, options = {}) {
        super();
        this.name = name;
        this.jobs = [];
        this.processing = false;
        console.log(`✅ Simple queue "${name}" created`);
    }

    async add(jobName, data, options = {}) {
        const job = {
            id: globalJobId++,
            name: jobName,
            data,
            options,
            status: "waiting",
            createdAt: new Date(),
            processedAt: null,
            progress: 0,
        };

        this.jobs.push(job);
        jobStorage.set(job.id, job);

        console.log(`📝 Job ${job.id} (${jobName}) added to queue "${this.name}"`);
        this.emit("job:added", job);

        // Process job immediately in next tick
        setImmediate(() => this.processNextJob());

        return job;
    }

    async processNextJob() {
        if (this.processing) return;

        const waitingJob = this.jobs.find(j => j.status === 'waiting');
        if (!waitingJob) return;

        this.processing = true;
        waitingJob.status = 'active';
        waitingJob.processedAt = new Date();

        console.log(`⚡ Processing job ${waitingJob.id} in queue "${this.name}"`);
        this.emit('job:active', waitingJob);

        // Simulate processing time
        setTimeout(() => {
            // ⬇️ keep job in storage instead of discarding
            waitingJob.status = 'completed';
            waitingJob.completedAt = new Date();

            console.log(`✅ Job ${waitingJob.id} completed in queue "${this.name}"`);
            this.emit('job:completed', waitingJob);

            // DO NOT remove job from jobStorage, keep for status lookups
            jobStorage.set(waitingJob.id, waitingJob);

            this.processing = false;
            setImmediate(() => this.processNextJob());
        }, 100);
    }
    async waitUntilReady() {
        console.log(`✅ Queue "${this.name}" is ready`);
        return Promise.resolve();
    }

    async close() {
        console.log(`📪 Queue "${this.name}" closed`);
        return Promise.resolve();
    }

    getJob(jobId) {
        return jobStorage.get(jobId);
    }

    getJobs(status = null) {
        if (!status) return this.jobs;
        return this.jobs.filter((job) => job.status === status);
    }

    // ✅ Added BullMQ-like API methods
    async getJobCounts() {
        return {
            waiting: this.jobs.filter((j) => j.status === "waiting").length,
            active: this.jobs.filter((j) => j.status === "active").length,
            completed: this.jobs.filter((j) => j.status === "completed").length,
            failed: this.jobs.filter((j) => j.status === "failed").length,
        };
    }

    async getWaitingCount() {
        return this.jobs.filter((j) => j.status === "waiting").length;
    }

    async getActiveCount() {
        return this.jobs.filter((j) => j.status === "active").length;
    }

    async getCompletedCount() {
        return this.jobs.filter((j) => j.status === "completed").length;
    }

    async getFailedCount() {
        return this.jobs.filter((j) => j.status === "failed").length;
    }
}

// Simple Worker class - no Redis
class SimpleWorker extends EventEmitter {
    constructor(name, processorFn, options = {}) {
        super();
        this.name = name;
        this.processor = processorFn;
        this.isRunning = true;
        console.log(`✅ Worker "${name}" created`);
    }

    async processJob(job) {
        if (!this.isRunning) return;

        console.log(`👷 Worker "${this.name}" processing job ${job.id}`);
        try {
            const result = await this.processor(job);
            this.emit("completed", job, result);
            return result;
        } catch (error) {
            console.error(`❌ Worker "${this.name}" job ${job.id} failed:`, error.message);
            this.emit("failed", job, error);
            throw error;
        }
    }

    async close() {
        this.isRunning = false;
        console.log(`👷 Worker "${this.name}" stopped`);
        return Promise.resolve();
    }
}

// Simple QueueEvents class - no Redis
class SimpleQueueEvents extends EventEmitter {
    constructor(name, options = {}) {
        super();
        this.name = name;
        console.log(`✅ QueueEvents "${name}" created`);

        const queue = queueStorage.get(name);
        if (queue) {
            queue.on("job:added", (job) => this.emit("waiting", { jobId: job.id }));
            queue.on("job:active", (job) => this.emit("active", { jobId: job.id }));
            queue.on("job:completed", (job) => this.emit("completed", { jobId: job.id }));
            queue.on("job:failed", (job, error) =>
                this.emit("failed", { jobId: job.id, failedReason: error.message })
            );
        }
    }

    async close() {
        console.log(`📊 QueueEvents "${this.name}" closed`);
        return Promise.resolve();
    }
}

// Factory functions
export function createQueue(name) {
    if (queueStorage.has(name)) return queueStorage.get(name);

    console.log(`📝 Creating queue: ${name}`);
    const queue = new SimpleQueue(name);
    queueStorage.set(name, queue);
    return queue;
}

export function createWorker(name, processorFn) {
    console.log(`👷 Creating worker: ${name}`);
    const worker = new SimpleWorker(name, processorFn);

    const queue = queueStorage.get(name);
    if (queue) {
        queue.on("job:active", async (job) => {
            try {
                await worker.processJob(job);
            } catch (error) {
                // already handled
            }
        });
    }

    worker.on("completed", (job) =>
        console.log(`🎉 Job ${job.id} in ${name} completed`)
    );
    worker.on("failed", (job, err) =>
        console.error(`❌ Job ${job?.id} in ${name} failed: ${err.message}`)
    );

    return worker;
}

export function createQueueEvents(name) {
    console.log(`📊 Creating queue events: ${name}`);
    const events = new SimpleQueueEvents(name);

    events.on("waiting", ({ jobId }) => console.log(`⏳ Job ${jobId} in ${name} is waiting`));
    events.on("active", ({ jobId }) => console.log(`⚡ Job ${jobId} in ${name} is now active`));
    events.on("completed", ({ jobId }) => console.log(`✅ Job ${jobId} in ${name} completed`));
    events.on("failed", ({ jobId, failedReason }) =>
        console.error(`❌ Job ${jobId} failed: ${failedReason}`)
    );

    return events;
}

// Utility functions
export function getQueueStats(name) {
    const queue = queueStorage.get(name);
    if (!queue) return null;
    return queue.getJobCounts();
}

export function getAllQueues() {
    return Array.from(queueStorage.keys());
}

console.log("✅ Redis-free queue system loaded successfully");
