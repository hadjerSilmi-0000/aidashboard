import app from "./src/app.js";
import configManager from "./src/config/index.js";
import logger from "./src/utils/logger.js";
import { initSocket } from "./src/socket/socketHandler.js";

const PORT = process.env.PORT || 5000;

let server;

// Graceful shutdown
const gracefulShutdown = () => {
    logger.info("Received shutdown signal, closing server gracefully...");

    if (server) {
        server.close(async () => {
            logger.info("HTTP server closed");
            try {
                await configManager.shutdown();
                logger.info("Database connections closed");
                process.exit(0);
            } catch (err) {
                logger.error("Error during shutdown: " + err.message);
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }
};

// Start server
const startServer = async () => {
    try {
        await configManager.initialize();
        logger.info("Configuration initialized successfully");

        // Use http.Server wrapper
        server = app.listen(PORT, () => {
            logger.info(`Server running on http://localhost:${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
            logger.info(
                `CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
            );
        });

        // Initialize socket.io with the HTTP server
        initSocket(server);

        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    } catch (err) {
        logger.error("Failed to start server: " + err.message);
        process.exit(1);
    }
};

startServer();
