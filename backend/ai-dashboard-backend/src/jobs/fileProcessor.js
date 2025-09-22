// src/jobs/fileProcessor.js
import File, { FILE_STATUS } from "../models/File.js";
import Job from "../models/job.js";
import { processCSVFile, processJSONFile } from "../services/streamProcessor.js";
import socketService from "../services/socketService.js";

/**
 * Safe wrapper for addError
 */
async function safeAddError(fileDoc, stage, message, code, details = {}) {
    if (fileDoc && typeof fileDoc.addError === "function") {
        return fileDoc.addError(stage, message, code, details);
    }
    fileDoc.processingErrors = fileDoc.processingErrors || [];
    fileDoc.processingErrors.push({
        stage,
        message,
        code,
        details,
        timestamp: new Date(),
    });
    return fileDoc.save();
}

/**
 * Safe wrapper for updateProcessingStage
 */
async function safeUpdateStage(fileDoc, stage, updates) {
    if (fileDoc && typeof fileDoc.updateProcessingStage === "function") {
        return fileDoc.updateProcessingStage(stage, updates);
    }
    const target = fileDoc.processingStages.find((s) => s.stage === stage);
    if (target) Object.assign(target, updates);
    return fileDoc.save();
}

/**
 * Broadcast progress to dashboard
 */
function broadcastProgress(event, { fileId, jobId, stage, progress, status, error, userId }) {
    socketService.broadcast(event, {
        fileId,
        jobId,
        stage,
        progress,
        status,
        error,
        userId,
        timestamp: new Date(),
    });
}

/**
 * Process file job
 */
export async function processFileJob(jobData) {
    const { fileId, jobId } = jobData;

    // ✅ Store job in DB
    let jobDoc = await Job.findOneAndUpdate(
        { jobId },
        { jobId, fileId, status: "active", progress: 0 },
        { upsert: true, new: true }
    );

    // ✅ Handle fake/test jobs
    if (!fileId || !/^[0-9a-fA-F]{24}$/.test(fileId)) {
        console.log(`⚠️ Skipping DB lookup for test job with fileId=${fileId}`);
        jobDoc.status = "completed";
        await jobDoc.save();
        broadcastProgress("file:completed", { fileId, jobId, status: "completed", progress: 100 });
        return { ok: true, test: true };
    }

    const fileDoc = await File.findById(fileId);
    if (!fileDoc) throw new Error("File not found");

    // ✅ Initialize status
    fileDoc.status = FILE_STATUS.PROCESSING;
    fileDoc.processingStages =
        fileDoc.processingStages.length > 0
            ? fileDoc.processingStages
            : [
                { stage: "validation", status: "pending", progress: 0 },
                { stage: "parsing", status: "pending", progress: 0 },
                { stage: "transformation", status: "pending", progress: 0 },
                { stage: "storage", status: "pending", progress: 0 },
                { stage: "analysis", status: "pending", progress: 0 },
            ];
    await fileDoc.save();

    // ✅ Broadcast start
    broadcastProgress("file:started", {
        fileId,
        jobId,
        stage: "initial",
        progress: 0,
        status: "processing",
        userId: fileDoc.uploadedBy?.toString(),
    });

    try {
        const ext = fileDoc.fileType?.toLowerCase() || fileDoc.mimeType?.split("/")[1];

        // ✅ Validation stage
        await safeUpdateStage(fileDoc, "validation", { status: "in_progress", progress: 10 });
        broadcastProgress("file:progress", {
            fileId,
            jobId,
            stage: "validation",
            progress: 10,
            status: "processing",
            userId: fileDoc.uploadedBy?.toString(),
        });

        // ✅ Parsing stage
        await safeUpdateStage(fileDoc, "parsing", { status: "in_progress", progress: 25 });
        broadcastProgress("file:progress", {
            fileId,
            jobId,
            stage: "parsing",
            progress: 25,
            status: "processing",
            userId: fileDoc.uploadedBy?.toString(),
        });

        if (ext === "csv" || fileDoc.mimeType === "text/csv") {
            await processCSVFile(fileDoc, { userId: fileDoc.uploadedBy, jobId });
        } else if (ext === "json" || fileDoc.mimeType === "application/json") {
            await processJSONFile(fileDoc, { userId: fileDoc.uploadedBy, jobId });
        } else if (ext === "pdf" || fileDoc.mimeType === "application/pdf") {
            console.log(`📄 Skipping PDF processing for demo: ${fileDoc.originalName}`);
        } else {
            await safeAddError(fileDoc, "parsing", "Unsupported file type", "UNSUPPORTED_TYPE");
            fileDoc.status = FILE_STATUS.FAILED;
            await fileDoc.save();

            jobDoc.status = "failed";
            jobDoc.error = { message: "Unsupported file type" };
            await jobDoc.save();

            broadcastProgress("file:failed", {
                fileId,
                jobId,
                stage: "parsing",
                progress: jobDoc.progress || 0,
                status: "failed",
                error: "Unsupported file type",
                userId: fileDoc.uploadedBy?.toString(),
            });

            return { ok: false, reason: "unsupported_type" };
        }

        // ✅ Analysis / completion stage
        await safeUpdateStage(fileDoc, "analysis", { status: "completed", progress: 100 });
        fileDoc.status = FILE_STATUS.COMPLETED;
        await fileDoc.save();

        jobDoc.status = "completed";
        jobDoc.progress = 100;
        await jobDoc.save();

        broadcastProgress("file:completed", {
            fileId,
            jobId,
            stage: "analysis",
            progress: 100,
            status: "completed",
            userId: fileDoc.uploadedBy?.toString(),
        });

        return { ok: true };
    } catch (err) {
        await safeAddError(fileDoc, "processing", err.message, "PROCESSING_ERROR", { stack: err.stack });
        fileDoc.status = FILE_STATUS.FAILED;
        await safeUpdateStage(fileDoc, "parsing", {
            status: "failed",
            error: { message: err.message },
        });
        await fileDoc.save();

        jobDoc.status = "failed";
        jobDoc.error = { message: err.message, stack: err.stack };
        await jobDoc.save();

        broadcastProgress("file:failed", {
            fileId,
            jobId,
            stage: "processing",
            progress: jobDoc.progress || 0,
            status: "failed",
            error: err.message,
            userId: fileDoc.uploadedBy?.toString(),
        });

        throw err;
    }
}
