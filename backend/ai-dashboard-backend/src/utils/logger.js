import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

const logDir = "logs";
const combinedLogPath = path.join(logDir, "combined.log");

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.colorize(),
        format.printf(({ timestamp, level, message, stack }) => {
            // Highlight Ethereal preview URLs in the console
            if (typeof message === "string" && message.includes("ethereal.email/message")) {
                return `${timestamp} [${level}]: ✉️ Ethereal Preview → ${message}`;
            }
            return `${timestamp} [${level}]: ${stack || message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: "logs/error.log", level: "error" }),
        new transports.File({ filename: "logs/combined.log" }),
    ],
});

// Convenience wrapper for Ethereal preview logs
logger.emailPreview = (url) => {
    logger.info(`✉️ Email Preview (Ethereal): ${url}`);
};

/**
 * Get recent log lines from combined.log
 * @param {number} limit
 * @returns {Promise<string[]>}
 */
logger.getRecent = async (limit = 50) => {
    try {
        if (!fs.existsSync(combinedLogPath)) return [];
        const data = fs.readFileSync(combinedLogPath, "utf-8");
        const lines = data.trim().split("\n");
        return lines.slice(-limit);
    } catch (err) {
        logger.error("Failed to read recent logs", err);
        return [];
    }
};

export default logger;
