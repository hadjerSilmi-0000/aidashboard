import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Session from "../models/Session.js";
import { createNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js"; // make sure your logger supports recent logs
import os from "os";

class AdminController {
    // ==========================
    // 1. USER MANAGEMENT
    // ==========================

    async listUsers(req, res) {
        const { page = 1, limit = 20 } = req.query;
        const users = await User.find()
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select("-password");
        const total = await User.countDocuments();
        res.json({ success: true, data: { users, total } });
    }

    async updateUserRole(req, res) {
        const { userId } = req.params;
        const { role } = req.body;
        if (!["admin", "manager"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }
        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, message: "Role updated", data: user });
    }

    async updateUserStatus(req, res) {
        const { userId } = req.params;
        const { status } = req.body;
        if (!["active", "suspended"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const user = await User.findByIdAndUpdate(userId, { status }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, message: "Status updated", data: user });
    }

    async getUserStats(req, res) {
        const [admins, managers, active, suspended] = await Promise.all([
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "manager" }),
            User.countDocuments({ status: "active" }),
            User.countDocuments({ status: "suspended" }),
        ]);
        res.json({
            success: true,
            data: { admins, managers, active, suspended },
        });
    }

    // ==========================
    // 2. SYSTEM MONITORING
    // ==========================

    async getSystemStats(req, res) {
        const stats = {
            users: await User.countDocuments(),
            activeSessions: await Session.countDocuments({ isActive: true }),
            notifications: await Notification.countDocuments(),
        };
        res.json({ success: true, data: stats });
    }

    async healthCheck(req, res) {
        res.json({ success: true, message: "System healthy" });
    }

    async getPerformanceMetrics(req, res) {
        const memory = process.memoryUsage();
        const uptime = process.uptime();

        res.json({
            success: true,
            data: {
                memory: {
                    rss: memory.rss,
                    heapUsed: memory.heapUsed,
                    heapTotal: memory.heapTotal,
                },
                uptimeSeconds: uptime,
                loadAvg: os.loadavg(),
            },
        });
    }

    async getRecentLogs(req, res) {
        try {
            const logs = await logger.getRecent(50);
            res.json({ success: true, data: logs });
        } catch (err) {
            res.status(500).json({ success: false, message: "Failed to fetch logs" });
        }
    }

    // ==========================
    // 3. ADMIN DASHBOARD APIs
    // ==========================

    async getOverview(req, res) {
        const [users, sessions, notifications] = await Promise.all([
            User.countDocuments(),
            Session.countDocuments(),
            Notification.countDocuments(),
        ]);

        res.json({
            success: true,
            data: {
                users,
                sessions,
                notifications,
            },
        });
    }

    async sendGlobalAlert(req, res) {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, message: "Message required" });

        await createNotification({
            title: "System Alert",
            message,
            type: "system",
            category: "system",
            priority: "high",
            roles: ["manager"], // send to all managers
        });

        res.json({ success: true, message: "Alert sent to all managers" });
    }

    async cleanupOldNotifications(req, res) {
        const retentionDays = parseInt(process.env.NOTIFICATION_RETENTION_DAYS || "30", 10);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);

        const result = await Notification.updateMany(
            { createdAt: { $lt: cutoff }, isArchived: false },
            { $set: { isArchived: true, isActive: false } }
        );

        res.json({ success: true, message: `Archived ${result.modifiedCount} old notifications` });
    }

    async revokeAllSessions(req, res) {
        await Session.updateMany({}, { isActive: false });
        res.json({ success: true, message: "All sessions revoked" });
    }

    async restartJobs(req, res) {
        // Placeholder – depends on your BullMQ or background job setup
        res.json({ success: true, message: "Background jobs restarted (stub)" });
    }
}

export default new AdminController();
