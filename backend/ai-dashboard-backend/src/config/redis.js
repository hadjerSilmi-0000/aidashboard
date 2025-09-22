// src/config/redis.js
import Redis from "ioredis";
import logger from "../utils/logger.js";

class RedisManager {
    constructor() {
        this.client = null;
        this.sub = null;
        this.pub = null;
        this.isConnected = false;
    }

    async connect() {
        // If disabled in env, skip Redis completely
        if (process.env.USE_REDIS !== "true") {
            logger.info("Redis is disabled (USE_REDIS=false)");
            return false;
        }

        const url = process.env.REDIS_URL;
        if (!url) throw new Error("Missing REDIS_URL env var");

        try {
            logger.info("Connecting to Redis...");
            this.client = new Redis(url, {
                enableReadyCheck: true,
                maxRetriesPerRequest: 2,
                lazyConnect: false,
            });
            this.sub = new Redis(url);
            this.pub = new Redis(url);

            this._setupEvents();
            await this._waitReady();
            this._setupShutdown();

            logger.info("Redis connected");
            return true;
        } catch (err) {
            logger.error(`Redis connection failed: ${err.message}`);
            return false; // don’t crash the app, just mark as not connected
        }
    }

    _setupEvents() {
        const clients = [
            { name: "main", client: this.client },
            { name: "subscriber", client: this.sub },
            { name: "publisher", client: this.pub },
        ];

        clients.forEach(({ name, client }) => {
            client.on("ready", () => {
                if (name === "main") this.isConnected = true;
                logger.info(`Redis ${name} ready`);
            });
            client.on("error", (err) => {
                if (name === "main") this.isConnected = false;
                logger.error(`Redis ${name} error: ${err.message}`);
            });
            client.on("end", () => {
                if (name === "main") this.isConnected = false;
                logger.warn(`Redis ${name} connection ended`);
            });
        });
    }

    async _waitReady() {
        await Promise.all([
            this.client.connect(),
            this.sub.connect(),
            this.pub.connect(),
        ]);
        await this.client.ping();
        this.isConnected = true;
    }

    _setupShutdown() {
        const shutdown = async (sig) => {
            logger.info(`Received ${sig}, closing Redis...`);
            try {
                await this.disconnect();
            } catch (err) {
                logger.error(`Error on Redis shutdown: ${err.message}`);
            }
        };

        ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((s) =>
            process.on(s, shutdown)
        );
    }

    async healthCheck() {
        if (process.env.USE_REDIS !== "true") {
            return { status: "disabled" };
        }
        if (!this.isConnected) {
            return { status: "unhealthy", message: "Not connected" };
        }
        try {
            const start = Date.now();
            await this.client.set("health:check", Date.now(), "EX", 5);
            await this.client.get("health:check");
            await this.client.del("health:check");
            const latency = Date.now() - start;
            return { status: "healthy", latency: `${latency}ms` };
        } catch (err) {
            return { status: "unhealthy", error: err.message };
        }
    }

    async disconnect() {
        if (process.env.USE_REDIS !== "true") return;
        const all = [this.client, this.sub, this.pub].filter(Boolean);
        await Promise.all(all.map((c) => c.quit()));
        this.isConnected = false;
        logger.info("Redis connections closed");
    }

    get redis() {
        return this.client;
    }
    get subscriber() {
        return this.sub;
    }
    get publisher() {
        return this.pub;
    }
}

const redisManager = new RedisManager();
export default redisManager;
