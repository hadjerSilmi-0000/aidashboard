// src/services/notificationService.js
import Notification from "../models/Notification.js";
import socketService from "./socketService.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";

/**
 * Create a new notification
 * @param {Object} options
 * @param {String} options.title
 * @param {String} options.message
 * @param {String} options.type
 * @param {String} options.category
 * @param {String} [options.priority]
 * @param {ObjectId} [options.userId]
 * @param {Array<String>} [options.roles]
 */
export async function createNotification({
    title,
    message,
    type,
    category,
    priority = "medium",
    userId = null,
    roles = [],
}) {
    let user = null;

    // 🔍 Check user preferences if targeting a single user
    if (userId) {
        user = await User.findById(userId);

        // Skip if user muted this type
        if (user?.notificationPreferences?.mutedTypes?.includes(type)) {
            return null;
        }
    }

    // 💾 Save to DB
    const notification = await Notification.create({
        title,
        message,
        type,
        category,
        priority,
        recipients: { userId, roles },
        delivery: { status: "pending", sentAt: new Date() },
    });

    // 🔔 In-app (WebSocket) delivery
    if (userId) {
        socketService.emitToUser(userId, "notification:new", notification);
    } else if (roles.length > 0) {
        roles.forEach((role) =>
            socketService.emitToRole(role, "notification:new", notification)
        );
    } else {
        socketService.broadcast("notification:new", notification);
    }

    // 📧 Email delivery (if enabled in user preferences)
    if (user && user.email && user.notificationPreferences?.deliveryChannels?.email) {
        try {
            await sendEmail({
                to: user.email,
                subject: title,
                html: `<p>${message}</p>`,
                text: message,
            });
        } catch (err) {
            console.error("❌ Email delivery failed:", err.message);
        }
    }

    return notification;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) return null;
    return notification.markAsRead();
}

/**
 * Bulk mark all notifications for a user as read
 */
export async function markAllAsRead(userId) {
    return Notification.updateMany(
        { "recipients.userId": userId, "delivery.status": { $ne: "read" } },
        { $set: { "delivery.status": "read", "delivery.readAt": new Date() } }
    );
}

/**
 * Fetch notifications for a user (with pagination)
 */
export async function getNotifications(userId, page = 1, limit = 20) {
    return Notification.find({ "recipients.userId": userId, isActive: true })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
}

/**
 * Get unread count for badge display
 */
export async function getUnreadCount(userId) {
    return Notification.countDocuments({
        "recipients.userId": userId,
        "delivery.status": { $ne: "read" },
        isActive: true,
    });
}

/**
 * Delete a notification (user can only delete their own)
 */
export async function deleteNotification(notificationId, userId) {
    return Notification.findOneAndDelete({
        _id: notificationId,
        "recipients.userId": userId,
    });
}

/**
 * Count all notifications for a user
 */
export async function countAll(userId) {
    return Notification.countDocuments({
        "recipients.userId": userId,
        isActive: true,
    });
}
