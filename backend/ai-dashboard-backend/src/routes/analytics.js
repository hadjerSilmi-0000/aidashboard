import express from "express";
import {
    fileOverview,
    fileTrends,
    fileErrors,
    runFileAnalytics,
} from "../controllers/analyticsController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";
import { requireAdmin } from "../middleware/Auth/roles.js";

const router = express.Router();

// File-level analytics (admin + manager)
router.get("/file/:fileId/overview", requireAuth, fileOverview);
router.get("/file/:fileId/trends", requireAuth, fileTrends);
router.get("/file/:fileId/errors", requireAuth, fileErrors);

// Manual re-run of analytics (admin only)
router.post("/file/:fileId/run", requireAuth, requireAdmin, runFileAnalytics);

export default router;
