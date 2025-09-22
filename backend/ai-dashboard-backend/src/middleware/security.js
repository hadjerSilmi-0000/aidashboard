// src/middleware/security.js
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import cors from "cors";

// Core security middleware for the whole app
class SecurityMiddleware {
    helmet() {
        return helmet();
    }

    cors() {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"];
        return cors({
            origin: (origin, cb) => {
                if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
                cb(new Error("Not allowed by CORS"));
            },
            credentials: true,
        });
    }

    sanitize() {
        return [mongoSanitize(), xss(), hpp()];
    }

    sizeLimit(maxSizeMB = 1) {
        return (req, res, next) => {
            const contentLength = parseInt(req.headers["content-length"] || "0");
            const maxSize = maxSizeMB * 1024 * 1024;
            if (contentLength > maxSize) {
                return res.status(413).json({
                    success: false,
                    code: "REQUEST_TOO_LARGE",
                    message: "Request payload too large",
                });
            }
            next();
        };
    }

    stack() {
        return [this.helmet(), this.cors(), this.sizeLimit(), ...this.sanitize()];
    }
}

export default new SecurityMiddleware();
