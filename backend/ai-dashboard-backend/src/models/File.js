import mongoose from "mongoose";

const { Schema } = mongoose;

export const FILE_TYPES = {
    CSV: "csv",
    JSON: "json",
    PDF: "pdf",
    IMAGE: "image",
    TEXT: "text",
    EXCEL: "excel",
    OTHER: "other",
};

export const FILE_STATUS = {
    UPLOADED: "uploaded",
    QUEUED: "queued",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
};

const ProcessingStageSchema = new Schema(
    {
        stage: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "in_progress", "in-progress", "completed", "failed"],
            default: "pending",
        },
        progress: { type: Number, default: 0 },
        startedAt: { type: Date },
        completedAt: { type: Date },
        error: {
            message: String,
            code: String,
        },
    },
    { _id: false }
);

const ProcessingErrorSchema = new Schema(
    {
        stage: String,
        message: String,
        code: String,
        meta: Schema.Types.Mixed,
    },
    { _id: false }
);

const FileSchema = new Schema(
    {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        fileType: { type: String, enum: Object.values(FILE_TYPES) },
        mimeType: { type: String },
        size: { type: Number },
        path: { type: String },

        status: {
            type: String,
            enum: Object.values(FILE_STATUS),
            default: FILE_STATUS.UPLOADED,
            index: true,
        },

        processingStages: { type: [ProcessingStageSchema], default: [] },
        processingErrors: { type: [ProcessingErrorSchema], default: [] },

        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true, suppressReservedKeysWarning: true }
);

// ─── Instance methods ──────────────────────────────────────────────────────

FileSchema.methods.addError = async function (stage, message, code, meta = {}) {
    this.processingErrors.push({ stage, message, code, meta });
    this.status = FILE_STATUS.FAILED;

    const stageEntry = this.processingStages.find((s) => s.stage === stage);
    if (stageEntry) {
        stageEntry.status = "failed";
        stageEntry.error = { message, code };
    }

    return this.save();
};

FileSchema.methods.updateProcessingStage = async function (stage, update = {}) {
    const stageEntry = this.processingStages.find((s) => s.stage === stage);
    if (stageEntry) {
        Object.assign(stageEntry, update);
    } else {
        this.processingStages.push({ stage, ...update });
    }
    return this.save();
};

FileSchema.methods.markStageCompleted = async function (stage) {
    return this.updateProcessingStage(stage, { status: "completed", progress: 100 });
};

FileSchema.methods.markQueued = async function () {
    this.status = FILE_STATUS.QUEUED;
    return this.save();
};

FileSchema.methods.markProcessing = async function () {
    this.status = FILE_STATUS.PROCESSING;
    return this.save();
};

FileSchema.methods.markCompleted = async function () {
    this.status = FILE_STATUS.COMPLETED;
    return this.save();
};

// ─── Static methods ────────────────────────────────────────────────────────

FileSchema.statics.findByUser = function (userId, { limit = 50, skip = 0 } = {}) {
    return this.find({ uploadedBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

FileSchema.statics.findByUserAndStatus = function (userId, status) {
    return this.find({ uploadedBy: userId, status }).sort({ createdAt: -1 });
};

const File = mongoose.model("File", FileSchema);
export default File;