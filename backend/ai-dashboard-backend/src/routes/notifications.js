import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";

const router = express.Router();

// All notifications routes require authentication (admin + manager)
router.use(requireAuth);

// List notifications
router.get("/", notificationController.listNotifications);

// Get notification stats
router.get("/stats", notificationController.getStats);

// Mark single notification as read
router.patch("/:id/read", notificationController.markAsRead);

// Mark all notifications as read
router.patch("/read-all", notificationController.markAllAsRead);

// Delete notification
router.delete("/:id", notificationController.deleteNotification);

export default router;
