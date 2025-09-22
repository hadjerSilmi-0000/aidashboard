import express from "express";
import {
    fileOverview,
    fileTrends,
    fileErrors,
    runFileAnalytics,
} from "../controllers/analyticsController.js";
import auth from "../middleware/Auth/requireAuth.js";
const router = express.Router();

// File-level analytics
router.get("/file/:fileId/overview", auth, fileOverview);
router.get("/file/:fileId/trends", auth, fileTrends);
router.get("/file/:fileId/errors", auth, fileErrors);

// Manual trigger (useful for admin/testing)
router.post("/file/:fileId/run", auth, runFileAnalytics);

export default router;
