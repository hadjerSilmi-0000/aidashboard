import mongoose from "mongoose";
import logger from "../utils/logger.js";

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5; // maximum connection retries
        this.retryDelay = 5000; // base delay in ms
        this.connectionState = "disconnected";
    }

    // Main connect method with retry and graceful shutdown
    async connect() {
        try {
            const uri = this.buildConnectionString();
            const options = this.getConnectionOptions();

            logger.info("Connecting to MongoDB...");
            this.setupEventListeners();

            await this.connectWithRetry(uri, options);
            this.setupGracefulShutdown();

            return true;
        } catch (error) {
            logger.error(`Database connection failed: ${error.message}`);
            throw error;
        }
    }

    // Build MongoDB URI from environment variables
    buildConnectionString() {
        const {
            MONGODB_HOST = "localhost",
            MONGODB_PORT = "27017",
            MONGODB_DATABASE = "ai_dashboard",
            MONGODB_USERNAME,
            MONGODB_PASSWORD,
            MONGODB_AUTH_SOURCE = "admin",
            MONGODB_REPLICA_SET,
            NODE_ENV,
        } = process.env;

        let uri;

        if (MONGODB_USERNAME && MONGODB_PASSWORD) {
            uri = `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}?authSource=${MONGODB_AUTH_SOURCE}`;
        } else {
            uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}`;
        }

        if (MONGODB_REPLICA_SET) {
            uri += uri.includes("?") ? "&" : "?";
            uri += `replicaSet=${MONGODB_REPLICA_SET}`;
        }

        if (NODE_ENV === "production") {
            uri += uri.includes("?") ? "&" : "?";
            uri += "ssl=true";
        }

        return uri;
    }

    // Recommended Mongoose options
    getConnectionOptions() {
        return {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            autoIndex: process.env.NODE_ENV !== "production",
        };
    }

    // Retry logic with exponential backoff
    async connectWithRetry(uri, options) {
        while (this.retryCount < this.maxRetries) {
            try {
                await mongoose.connect(uri, options);
                this.isConnected = true;
                this.connectionState = "connected";
                logger.info(`MongoDB connected (attempt ${this.retryCount + 1})`);
                this.retryCount = 0;
                return;
            } catch (error) {
                this.retryCount++;
                this.connectionState = "connecting";
                logger.warn(`Connection attempt ${this.retryCount} failed: ${error.message}`);

                if (this.retryCount >= this.maxRetries) {
                    this.connectionState = "failed";
                    throw new Error(`Unable to connect after ${this.maxRetries} attempts`);
                }

                const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
                logger.info(`Retrying in ${delay}ms...`);
                await this.delay(delay);
            }
        }
    }

    // MongoDB connection events
    setupEventListeners() {
        mongoose.connection.on("connected", () => {
            logger.info("MongoDB connection established");
            this.isConnected = true;
            this.connectionState = "connected";
        });

        mongoose.connection.on("error", (error) => {
            logger.error(`MongoDB error: ${error.message}`);
            this.connectionState = "error";
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB disconnected");
            this.isConnected = false;
            this.connectionState = "disconnected";
            this.attemptReconnection();
        });

        mongoose.connection.on("reconnected", () => {
            logger.info("MongoDB reconnected");
            this.isConnected = true;
            this.connectionState = "connected";
        });
    }

    // Try to reconnect if the connection drops
    async attemptReconnection() {
        if (this.connectionState === "connecting") return;

        logger.info("Reconnecting to MongoDB...");
        this.connectionState = "connecting";
        this.retryCount = 0;

        try {
            await this.connectWithRetry(this.buildConnectionString(), this.getConnectionOptions());
        } catch (error) {
            logger.error(`Reconnection failed: ${error.message}`);
        }
    }

    // Graceful shutdown on process termination
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`Received ${signal}, closing MongoDB connection...`);
            try {
                await mongoose.connection.close();
                logger.info("MongoDB connection closed");
                process.exit(0);
            } catch (error) {
                logger.error(`Error during shutdown: ${error.message}`);
                process.exit(1);
            }
        };

        ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
            process.on(signal, () => shutdown(signal));
        });
    }

    // Health check with ping and stats
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return {
                    status: "unhealthy",
                    message: "Not connected",
                    details: { state: this.connectionState, retryCount: this.retryCount },
                };
            }

            const adminDb = mongoose.connection.db.admin();
            const result = await adminDb.ping();

            if (result.ok === 1) {
                const stats = await mongoose.connection.db.stats();
                return {
                    status: "healthy",
                    message: "MongoDB connection is active",
                    details: {
                        state: this.connectionState,
                        database: mongoose.connection.name,
                        collections: stats.collections,
                        dataSize: stats.dataSize,
                        indexSize: stats.indexSize,
                        uptime: process.uptime(),
                    },
                };
            }

            return { status: "unhealthy", message: "Ping failed" };
        } catch (error) {
            return {
                status: "unhealthy",
                message: "Health check failed",
                error: error.message,
                details: { state: this.connectionState },
            };
        }
    }

    // Disconnect from MongoDB
    async disconnect() {
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            this.connectionState = "disconnected";
            logger.info("MongoDB disconnected");
        } catch (error) {
            logger.error(`Error during disconnect: ${error.message}`);
            throw error;
        }
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Getters
    get connected() {
        return this.isConnected;
    }

    get state() {
        return this.connectionState;
    }

    get connection() {
        return mongoose.connection;
    }
}

const databaseManager = new DatabaseManager();
export default databaseManager;
