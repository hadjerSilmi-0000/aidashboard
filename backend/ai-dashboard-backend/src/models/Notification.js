// /src/models/Notification.js
import mongoose from "mongoose";

const { Schema } = mongoose;

// Notification types
const NOTIFICATION_TYPES = {
    SYSTEM: "system",
    USER: "user",
    FILE_PROCESSING: "file_processing",
    AI_ANALYSIS: "ai_analysis",
    SECURITY: "security",
    ADMIN: "admin",
    DATA_INSIGHT: "data_insight",
    ERROR: "error",
    SUCCESS: "success",
    WARNING: "warning",
    INFO: "info",
};

// Priority levels
const PRIORITY_LEVELS = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
};

// Delivery status
const DELIVERY_STATUS = {
    PENDING: "pending",
    SENT: "sent",
    DELIVERED: "delivered",
    READ: "read",
    FAILED: "failed",
};

// Schema
const notificationSchema = new Schema(
    {
        title: { type: String, required: true, maxlength: 200, trim: true },
        message: { type: String, required: true, maxlength: 1000, trim: true },
        type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
        category: { type: String, enum: ["system", "user", "admin", "ai", "file", "security"], required: true },
        priority: { type: String, enum: Object.values(PRIORITY_LEVELS), default: PRIORITY_LEVELS.MEDIUM },
        recipients: {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            roles: [{ type: String, enum: ["admin", "user", "moderator", "analyst"] }],
        },
        delivery: {
            status: { type: String, enum: Object.values(DELIVERY_STATUS), default: DELIVERY_STATUS.PENDING },
            sentAt: Date,
            deliveredAt: Date,
            readAt: Date,
        },
        isActive: { type: Boolean, default: true },
        isArchived: { type: Boolean, default: false },
    },
    { timestamps: true, collection: "notifications" }
);

// Virtuals
notificationSchema.virtual("isRead").get(function () {
    return this.delivery.status === DELIVERY_STATUS.READ;
});

// Methods
notificationSchema.methods.markAsRead = function () {
    this.delivery.status = DELIVERY_STATUS.READ;
    this.delivery.readAt = new Date();
    return this.save();
};

notificationSchema.methods.archive = function () {
    this.isArchived = true;
    this.isActive = false;
    return this.save();
};

// Statics
notificationSchema.statics.findUnreadForUser = function (userId, limit = 20) {
    return this.find({
        "recipients.userId": userId,
        "delivery.status": { $ne: DELIVERY_STATUS.READ },
        isActive: true,
        isArchived: false,
    })
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit);
};

notificationSchema.statics.createSystemNotification = function (data) {
    return this.create({
        ...data,
        category: "system",
        type: NOTIFICATION_TYPES.SYSTEM,
    });
};

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
