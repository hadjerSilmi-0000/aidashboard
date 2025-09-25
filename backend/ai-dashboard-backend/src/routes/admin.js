import express from "express";
import adminController from "../controllers/adminController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";
import { requireAdmin } from "../middleware/Auth/roles.js";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// ================= USER MANAGEMENT =================

// List all users (admin only)
router.get("/users", adminController.listUsers);

// Get user statistics (admin only)
router.get("/users/stats", adminController.getUserStats);

// Update user role (admin only)
router.put("/users/:userId/role", adminController.updateUserRole);

// Update user status (admin only)
router.put("/users/:userId/status", adminController.updateUserStatus);

// ================= SYSTEM MONITORING =================

// System stats (admin only)
router.get("/stats", adminController.getSystemStats);

// System health (admin only)
router.get("/health", adminController.healthCheck);

// Performance metrics (admin only)
router.get("/metrics", adminController.getPerformanceMetrics);

// Recent system logs (admin only)
router.get("/logs", adminController.getRecentLogs);

// ================= ADMIN DASHBOARD =================

// Admin overview (admin only)
router.get("/overview", adminController.getOverview);

// Send global alert (admin only)
router.post("/alerts", adminController.sendGlobalAlert);

// Cleanup old notifications (admin only)
router.post("/cleanup", adminController.cleanupOldNotifications);

// Revoke all sessions (admin only)
router.post("/revoke-sessions", adminController.revokeAllSessions);

// Restart background jobs (admin only)
router.post("/restart-jobs", adminController.restartJobs);

export default router;
