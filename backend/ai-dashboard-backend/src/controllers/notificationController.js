import * as notificationService from "../services/notificationService.js";


// List notifications (paginated)
export async function listNotifications(req, res, next) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = req.user._id;

        const notifications = await notificationService.getNotifications(userId, page, limit);
        const unreadCount = await notificationService.getUnreadCount(userId);

        res.json({
            page,
            limit,
            count: notifications.length,
            unreadCount,
            notifications,
        });
    } catch (err) {
        next(err);
    }
}


// Mark single notification as read
export async function markAsRead(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await notificationService.markAsRead(id);

        if (!updated) return res.status(404).json({ message: "Notification not found" });

        res.json({ message: "Notification marked as read", notification: updated });
    } catch (err) {
        next(err);
    }
}


// Mark all notifications as read for current user
export async function markAllAsRead(req, res, next) {
    try {
        const userId = req.user._id;
        await notificationService.markAllAsRead(userId);
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
}


// Delete a notification
export async function deleteNotification(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await notificationService.deleteNotification(id, req.user._id);

        if (!deleted) return res.status(404).json({ message: "Notification not found" });

        res.json({ message: "Notification deleted" });
    } catch (err) {
        next(err);
    }
}


// Get notification stats (unread count, total)
export async function getStats(req, res, next) {
    try {
        const userId = req.user._id;
        const unreadCount = await notificationService.getUnreadCount(userId);
        const total = await notificationService.countAll(userId);

        res.json({ total, unreadCount });
    } catch (err) {
        next(err);
    }
}
