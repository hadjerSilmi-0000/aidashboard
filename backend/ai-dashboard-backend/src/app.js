// ================= LOAD ENV FIRST =================
import dotenv from "dotenv";
dotenv.config();

console.log("ENV CHECK:", process.env.SMTP_HOST, process.env.SMTP_USER);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { setupSwagger } from "./config/swagger.js";
import logger from "./utils/logger.js";
import analyticsRoutes from "./routes/analytics.js";
import { initEmail } from "./utils/email.js";

// Route modules
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import jobRoutes from "./routes/jobs.js";
import aiJobRoutes from "./routes/aijob.js";
import notificationRoutes from "./routes/notifications.js";
import adminRoutes from "./routes/admin.js";
import configManager from "./config/index.js";
import healthRoutes from "./routes/health.js";

const app = express();

// ================= SECURITY MIDDLEWARE =================
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    })
);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
        error: "Too many authentication attempts, please try again later.",
        retryAfter: "15 minutes",
    },
});

// ================= GLOBAL MIDDLEWARE =================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(
            `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
        );
    });
    next();
});

// ================= ROUTES =================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AI Dashboard Backend API",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        endpoints: {
            auth: "/api/auth",
            files: "/api/files",
            jobs: "/api/jobs",
            health: "/health",
        },
    });
});

app.get("/health", async (req, res) => {
    try {
        const health = await configManager.healthCheck();
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            health,
        });
    } catch (err) {
        logger.error("Health check failed: " + err.message);
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: err.message,
        });
    }
});

app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "AI Dashboard API v1.0",
        availableRoutes: [
            "GET /api/auth/health",
            "POST /api/auth/register",
            "POST /api/auth/login",
            "POST /api/auth/refresh-token",
            "GET /api/auth/profile",
            "POST /api/auth/logout",
            "POST /api/files/upload",
            "GET /api/files",
            "GET /api/files/:id",
            "DELETE /api/files/:id",
            "GET /api/jobs/:id/status",
            "DELETE /api/jobs/:id",
            "GET /api/jobs/stats/all",
        ],
    });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai/jobs", aiJobRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", healthRoutes);

// ================= ERROR HANDLING =================
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, {
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    const isDev = process.env.NODE_ENV === "development";
    res.status(err.status || 500).json({
        success: false,
        message: isDev ? err.message : "Internal Server Error",
        ...(isDev && { stack: err.stack }),
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
});

setupSwagger(app);

// ================= START SERVER =================
const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        await initEmail();
        logger.info("Email service initialized");

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
        });
    } catch (error) {
        logger.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

export default app;