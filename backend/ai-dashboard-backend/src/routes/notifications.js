import express from "express";
import * as notificationController from "../controllers/notificationController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

router.get("/", notificationController.listNotifications);
router.get("/stats", notificationController.getStats);
router.patch("/:id/read", notificationController.markAsRead);
router.patch("/read-all", notificationController.markAllAsRead);
router.delete("/:id", notificationController.deleteNotification);

export default router;
