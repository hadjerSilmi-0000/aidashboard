import express from "express";
const router = express.Router();

// ✅ Full system health check
router.get("/health", async (req, res) => {
    try {
        // optional: test MongoDB
        const dbStatus = global.mongoose?.connection?.readyState === 1 ? "connected" : "disconnected";

        // optional: test Redis or Queue if you use them
        const redisStatus = global.redisClient ? "connected" : "not_used";

        res.json({
            success: true,
            backend: "running",
            database: dbStatus,
            redis: redisStatus,
            env: process.env.NODE_ENV || "development",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
