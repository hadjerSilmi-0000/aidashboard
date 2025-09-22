import mongoose from "mongoose";

const { Schema } = mongoose;

export const FILE_TYPES = {
    CSV: "csv",
    JSON: "json",
    PDF: "pdf",
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
        stage: { type: String, required: true }, // validation, parsing, etc.
        status: {
            type: String,
            enum: ["pending", "in-progress", "completed", "failed"],
            default: "pending",
        },
        progress: { type: Number, default: 0 }, // %
        error: {
            message: String,
            code: String,
        },
    },
    { _id: false }
);

const ErrorSchema = new Schema(
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
        fileType: { type: String }, // pdf, csv, json, etc.
        mimeType: { type: String },
        size: { type: Number },
        path: { type: String },

        status: {
            type: String,
            enum: Object.values(FILE_STATUS),
            default: FILE_STATUS.UPLOADED,
        },

        processingStages: { type: [ProcessingStageSchema], default: [] },
        errors: { type: [ErrorSchema], default: [] },

        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

/**
 * Helper methods
 */
FileSchema.methods.addError = async function (stage, message, code, meta = {}) {
    this.errors.push({ stage, message, code, meta });
    this.status = FILE_STATUS.FAILED;

    const stageEntry = this.processingStages.find((s) => s.stage === stage);
    if (stageEntry) {
        stageEntry.status = "failed";
        stageEntry.error = { message, code };
    }

    return this.save();
};

FileSchema.methods.updateProcessingStage = async function (
    stage,
    update = {}
) {
    const stageEntry = this.processingStages.find((s) => s.stage === stage);
    if (stageEntry) {
        Object.assign(stageEntry, update);
    } else {
        this.processingStages.push({ stage, ...update });
    }
    return this.save();
};

FileSchema.methods.markStageCompleted = async function (stage) {
    return this.updateProcessingStage(stage, {
        status: "completed",
        progress: 100,
    });
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

const File = mongoose.model("File", FileSchema);

export default File;
