import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { setupSwagger } from "./config/swagger.js";

import logger from "./utils/logger.js";
import analyticsRoutes from "./routes/analytics.js";

// Routes
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import jobRoutes from "./routes/jobs.js";
import aiJobRoutes from "./routes/aijob.js";

const app = express();

// ================= SECURITY MIDDLEWARE =================

// Enable CORS
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
        optionsSuccessStatus: 200,
    })
);

// Security headers
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

// Global rate limit
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

// Stricter rate limit for auth routes
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

// Request logger
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

// Root route
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

// Health check route
import configManager from "./config/index.js";
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

// API overview
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

// Mount routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai/jobs", aiJobRoutes);

// ================= ERROR HANDLING =================

// Error handler
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

// Not found handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        availableRoutes: {
            auth: "/api/auth/*",
            files: "/api/files/*",
            jobs: "/api/jobs/*",
            health: "/health",
            root: "/",
        },
    });
});

setupSwagger(app);
export default app;
