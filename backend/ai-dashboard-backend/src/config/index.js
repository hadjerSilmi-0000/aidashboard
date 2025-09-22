import databaseManager from "./database.js";
import logger from "../utils/logger.js";

// Conditionally load Redis (keeps it optional for dev/test)
let redisManager = null;
if (process.env.USE_REDIS === "true") {
    const { default: rm } = await import("./redis.js");
    redisManager = rm;
}

class ConfigManager {
    constructor() {
        this.services = { mongodb: databaseManager };
        if (redisManager) this.services.redis = redisManager;
        this.initialized = false;
    }

    async initialize() {
        try {
            logger.info("Initializing services...");
            const results = await Promise.all(
                Object.entries(this.services).map(async ([name, svc]) => {
                    try {
                        await svc.connect();
                        logger.info(`${name} connected`);
                        return { name, status: "connected" };
                    } catch (err) {
                        logger.error(`${name} connection failed: ${err.message}`);
                        return { name, status: "failed", error: err.message };
                    }
                })
            );

            const failed = results.filter((r) => r.status === "failed");
            if (failed.length > 0) {
                throw new Error(
                    `Failed services: ${failed.map((f) => f.name).join(", ")}`
                );
            }

            this.initialized = true;
            logger.info("All services ready");
            return true;
        } catch (err) {
            logger.error(`Initialization error: ${err.message}`);
            throw err;
        }
    }

    async healthCheck() {
        const results = {};
        for (const [name, svc] of Object.entries(this.services)) {
            try {
                results[name] = (await svc.healthCheck?.()) ?? { status: "unknown" };
            } catch (err) {
                results[name] = {
                    status: "error",
                    message: `Health check failed`,
                    error: err.message,
                };
            }
        }

        const overall = Object.values(results).every((r) => r.status === "healthy")
            ? "healthy"
            : "unhealthy";

        return { status: overall, timestamp: new Date().toISOString(), services: results };
    }

    async shutdown() {
        logger.info("Shutting down services...");
        await Promise.allSettled(
            Object.entries(this.services).map(async ([name, svc]) => {
                try {
                    if (svc.disconnect) {
                        await svc.disconnect();
                        logger.info(`${name} disconnected`);
                    }
                } catch (err) {
                    logger.error(`Error disconnecting ${name}: ${err.message}`);
                }
            })
        );
        this.initialized = false;
        logger.info("Shutdown complete");
    }

    // Getters
    get isInitialized() {
        return this.initialized;
    }
    get mongodb() {
        return this.services.mongodb;
    }
    get redis() {
        return this.services.redis;
    }
}

const configManager = new ConfigManager();
export default configManager;

