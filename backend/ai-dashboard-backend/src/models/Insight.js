import mongoose from "mongoose";

const { Schema } = mongoose;

// Insight Schema for AI-generated insights and analysis
const insightSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200, index: true },
        description: { type: String, required: true, trim: true, maxlength: 2000 },

        // Categorization
        type: {
            type: String,
            required: true,
            enum: [
                "trend_analysis",
                "anomaly_detection",
                "pattern_recognition",
                "correlation_analysis",
                "prediction",
                "recommendation",
                "summary",
                "statistical_insight",
                "data_quality",
                "performance_metric",
            ],
            index: true,
        },
        category: {
            type: String,
            required: true,
            enum: [
                "financial",
                "operational",
                "marketing",
                "sales",
                "customer",
                "product",
                "quality",
                "performance",
                "risk",
                "general",
            ],
            index: true,
        },
        priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
        severity: { type: String, enum: ["info", "warning", "error", "critical"], default: "info" },

        // Confidence
        confidence: {
            score: { type: Number, min: 0, max: 1, required: true },
            level: { type: String, enum: ["very_low", "low", "medium", "high", "very_high"], required: true, index: true },
        },

        // Source data
        sourceData: {
            fileIds: [{ type: Schema.Types.ObjectId, ref: "File" }],
            dataPointIds: [{ type: Schema.Types.ObjectId, ref: "DataPoint" }],
            dateRange: { start: Date, end: Date },
            recordCount: Number,
        },

        // Content
        content: {
            summary: { type: String, required: true, maxlength: 1000 },
            details: { type: String, maxlength: 5000 },
        },

        // AI metadata
        aiMetadata: {
            model: { type: String, required: true },
            version: { type: String, required: true },
            prompt: String,
            processingTime: Number,
        },

        // Recommendations
        recommendations: [
            {
                action: { type: String, required: true },
                priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
                impact: { type: String, enum: ["low", "medium", "high"], default: "medium" },
            },
        ],

        // Status
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed", "archived"],
            default: "pending",
            index: true,
        },
        processingStatus: {
            stage: { type: String, enum: ["queued", "analyzing", "generating", "validating", "finalizing"], default: "queued" },
            progress: { type: Number, min: 0, max: 100, default: 0 },
            startedAt: Date,
            completedAt: Date,
        },

        // User interaction
        userInteraction: {
            views: { type: Number, default: 0 },
            ratings: [
                {
                    userId: { type: Schema.Types.ObjectId, ref: "User" },
                    rating: { type: Number, min: 1, max: 5 },
                    feedback: String,
                    createdAt: { type: Date, default: Date.now },
                },
            ],
        },

        // Ownership
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        visibility: { type: String, enum: ["private", "team", "organization", "public"], default: "private", index: true },

        // Metadata
        tags: [{ type: String, trim: true, lowercase: true }],
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
        archived: { type: Boolean, default: false, index: true },
    },
    { timestamps: true, collection: "insights" }
);

// Virtuals
insightSchema.virtual("averageRating").get(function () {
    if (!this.userInteraction.ratings?.length) return 0;
    const total = this.userInteraction.ratings.reduce((sum, r) => sum + r.rating, 0);
    return Math.round((total / this.userInteraction.ratings.length) * 10) / 10;
});
insightSchema.virtual("isExpired").get(function () {
    return this.expiresAt && this.expiresAt < new Date();
});

// Methods
insightSchema.methods.addRating = function (userId, rating, feedback) {
    this.userInteraction.ratings = this.userInteraction.ratings.filter(r => !r.userId.equals(userId));
    this.userInteraction.ratings.push({ userId, rating, feedback, createdAt: new Date() });
    return this.save();
};
insightSchema.methods.incrementViews = function () {
    this.userInteraction.views += 1;
    return this.save();
};
insightSchema.methods.updateProcessingStatus = function (stage, progress, error = null) {
    this.processingStatus.stage = stage;
    this.processingStatus.progress = progress;
    if (error) {
        this.status = "failed";
        this.processingStatus.error = error;
    } else if (progress === 100) {
        this.status = "completed";
        this.processingStatus.completedAt = new Date();
    }
    return this.save();
};

// Statics
insightSchema.statics.findByConfidenceLevel = function (level) {
    return this.find({ "confidence.level": level, status: "completed", archived: false }).sort({ createdAt: -1 });
};
insightSchema.statics.findHighPriorityPending = function () {
    return this.find({
        status: { $in: ["pending", "processing"] },
        priority: { $in: ["high", "critical"] },
        archived: false,
    }).sort({ priority: -1, createdAt: 1 });
};

const Insight = mongoose.model("Insight", insightSchema);
export default Insight;
