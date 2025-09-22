import mongoose from "mongoose";

const { Schema } = mongoose;

// ----------------------
// Main schema
// ----------------------
const DataPointSchema = new Schema(
    {
        // Identification
        fileId: {
            type: Schema.Types.ObjectId,
            ref: "File",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Raw data
        data: { type: Schema.Types.Mixed, required: true },

        // Classification
        dataType: {
            type: String,
            enum: [
                "csv_row",
                "json_object",
                "time_series",
                "log_entry",
                "metric",
                "event",
                "custom",
            ],
            required: true,
            index: true,
        },

        // Source info
        source: {
            fileName: { type: String, required: true },
            fileType: {
                type: String,
                enum: ["csv", "json", "xlsx", "txt", "xml"],
                required: true,
            },
            rowNumber: { type: Number, index: true },
            sheetName: String,
        },

        // Timestamps
        timestamp: { type: Date, default: Date.now, index: true },
        extractedTimestamp: { type: Date, index: true },

        // Quality
        quality: {
            isValid: { type: Boolean, default: true },
            validationErrors: [
                {
                    field: String,
                    error: String,
                    severity: {
                        type: String,
                        enum: ["low", "medium", "high", "critical"],
                        default: "medium",
                    },
                },
            ],
            completeness: { type: Number, min: 0, max: 100, default: 100 },
        },

        // Processing
        processing: {
            status: {
                type: String,
                enum: ["pending", "processing", "completed", "failed", "skipped"],
                default: "pending",
            },
            aiAnalyzed: { type: Boolean, default: false },
            lastProcessed: Date,
            processingErrors: [
                { stage: String, error: String, timestamp: { type: Date, default: Date.now } },
            ],
        },

        // Relationships
        relatedDataPoints: [{ type: Schema.Types.ObjectId, ref: "DataPoint" }],
        insights: [{ type: Schema.Types.ObjectId, ref: "Insight" }],

        // Extensions
        customFields: { type: Map, of: Schema.Types.Mixed, default: new Map() },

        // Soft delete
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: Date,
    },
    {
        timestamps: true,
        collection: "datapoints",
        versionKey: "__v",
        toJSON: {
            virtuals: true,
            transform: (_, ret) => {
                delete ret.__v;
                delete ret.isDeleted;
                return ret;
            },
        },
        toObject: { virtuals: true },
    }
);

// ----------------------
// Indexes
// ----------------------
DataPointSchema.index({ fileId: 1, timestamp: -1 });
DataPointSchema.index({ userId: 1, dataType: 1 });
DataPointSchema.index({ "processing.status": 1 });
DataPointSchema.index({ "processing.aiAnalyzed": 1 });
DataPointSchema.index({ "quality.isValid": 1 });

// ----------------------
// Virtuals
// ----------------------
DataPointSchema.virtual("summary").get(function () {
    const fieldCount = Object.keys(this.data || {}).length;
    const errorCount = this.quality?.validationErrors?.length || 0;
    return {
        fieldCount,
        errorCount,
        hasErrors: errorCount > 0,
        completeness: this.quality?.completeness || 0,
    };
});

// ----------------------
// Instance Methods
// ----------------------
DataPointSchema.methods.hasField = function (field) {
    return this.data && Object.prototype.hasOwnProperty.call(this.data, field);
};

DataPointSchema.methods.getNumericValue = function (field) {
    if (!this.hasField(field)) return null;
    const num = parseFloat(this.data[field]);
    return isNaN(num) ? null : num;
};

DataPointSchema.methods.addValidationError = function (field, error, severity = "medium") {
    this.quality.validationErrors.push({ field, error, severity });
    this.quality.isValid = false;
};

DataPointSchema.methods.markProcessed = function (status = "completed") {
    this.processing.status = status;
    this.processing.lastProcessed = new Date();
};

// ----------------------
// Statics
// ----------------------
DataPointSchema.statics.findByFileId = function (
    fileId,
    page = 1,
    limit = 100,
    filters = {}
) {
    const id =
        typeof fileId === "string" ? new mongoose.Types.ObjectId(fileId) : fileId;

    return this.find({
        fileId: id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        ...filters
    })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("fileId", "originalName fileType")
        .populate("insights", "type content.summary confidence");
};

DataPointSchema.statics.getFileAnalytics = function (fileId) {
    const id =
        typeof fileId === "string" ? new mongoose.Types.ObjectId(fileId) : fileId;

    return this.aggregate([
        { $match: { fileId: id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] } },
        {
            $group: {
                _id: "$dataType",
                count: { $sum: 1 },
                validCount: { $sum: { $cond: ["$quality.isValid", 1, 0] } },
                avgCompleteness: { $avg: "$quality.completeness" },
                firstTimestamp: { $min: "$timestamp" },
                lastTimestamp: { $max: "$timestamp" },
            },
        },
        {
            $project: {
                dataType: "$_id",
                totalRecords: "$count",
                validRecords: "$validCount",
                invalidRecords: { $subtract: ["$count", "$validCount"] },
                validityRate: {
                    $multiply: [{ $divide: ["$validCount", "$count"] }, 100],
                },
                avgCompleteness: { $round: ["$avgCompleteness", 2] },
                dateRange: { start: "$firstTimestamp", end: "$lastTimestamp" },
            },
        },
    ]);
};

// ----------------------
// Hooks
// ----------------------
DataPointSchema.pre("save", function (next) {
    // Auto-extract timestamp
    if (this.data && !this.extractedTimestamp) {
        for (const key of ["timestamp", "date", "created_at", "time", "datetime"]) {
            if (this.data[key]) {
                const extracted = new Date(this.data[key]);
                if (!isNaN(extracted.getTime())) {
                    this.extractedTimestamp = extracted;
                    break;
                }
            }
        }
    }

    // Completeness
    if (this.data) {
        const fields = Object.keys(this.data);
        const nonNull = fields.filter(
            (f) =>
                this.data[f] !== null &&
                this.data[f] !== undefined &&
                this.data[f] !== ""
        );
        this.quality.completeness = fields.length
            ? Math.round((nonNull.length / fields.length) * 100)
            : 0;
    }
    next();
});

// ----------------------
// Export Model
// ----------------------
const DataPoint = mongoose.model("DataPoint", DataPointSchema);
export default DataPoint;