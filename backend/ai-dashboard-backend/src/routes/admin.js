import express from "express";
import adminController from "../controllers/adminController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";
import { requireAdmin } from "../middleware/Auth/roles.js";

const router = express.Router();

// Protect all with admin role
router.use(requireAuth, requireAdmin);

// USER MANAGEMENT
router.get("/users", adminController.listUsers);
router.get("/users/stats", adminController.getUserStats);
router.put("/users/:userId/role", adminController.updateUserRole);
router.put("/users/:userId/status", adminController.updateUserStatus);

// SYSTEM MONITORING
router.get("/stats", adminController.getSystemStats);
router.get("/health", adminController.healthCheck);
router.get("/metrics", adminController.getPerformanceMetrics);
router.get("/logs", adminController.getRecentLogs);

// ADMIN DASHBOARD APIs
router.get("/overview", adminController.getOverview);
router.post("/alerts", adminController.sendGlobalAlert);
router.post("/cleanup", adminController.cleanupOldNotifications);
router.post("/revoke-sessions", adminController.revokeAllSessions);
router.post("/restart-jobs", adminController.restartJobs);

export default router;
