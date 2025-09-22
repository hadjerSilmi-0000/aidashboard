import logger from "../utils/logger.js";
import { HTTP_STATUS } from "../utils/constants.js";

// Custom Error Classes
export class AuthenticationError extends Error {
    constructor(message, code = "AUTH_ERROR", statusCode = HTTP_STATUS.UNAUTHORIZED) {
        super(message);
        this.name = "AuthenticationError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class AuthorizationError extends Error {
    constructor(message, code = "AUTHZ_ERROR", statusCode = HTTP_STATUS.FORBIDDEN) {
        super(message);
        this.name = "AuthorizationError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class SecurityError extends Error {
    constructor(message, code = "SECURITY_ERROR", statusCode = HTTP_STATUS.FORBIDDEN) {
        super(message);
        this.name = "SecurityError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

// Main Error Handler
export const authErrorHandler = (err, req, res, next) => {
    const requestId =
        req.requestId ||
        `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    req.requestId = requestId;

    const baseError = {
        success: false,
        error: {
            code: err.code || "UNKNOWN_ERROR",
            message: err.message || "An authentication error occurred",
            requestId,
        },
    };

    if (err instanceof AuthenticationError) {
        logger.warn("Authentication error", { requestId, userId: req.user?._id, code: err.code });
        return res.status(err.statusCode).json(baseError);
    }

    if (err instanceof AuthorizationError) {
        logger.warn("Authorization error", { requestId, userId: req.user?._id, code: err.code });
        return res.status(err.statusCode).json(baseError);
    }

    if (err instanceof SecurityError) {
        logger.error("Security error", { requestId, userId: req.user?._id, code: err.code });
        return res.status(err.statusCode).json(baseError);
    }

    // Fallback generic error
    logger.error("Unhandled error in auth system", {
        requestId,
        userId: req.user?._id,
        error: { name: err.name, message: err.message, stack: err.stack },
    });

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
            code: "SERVER_ERROR",
            message: "An unexpected error occurred",
            requestId,
        },
    });
};

// Simple Health Check (basic, not Redis/BullMQ)
export const getSecurityHealthCheck = () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
});

export default authErrorHandler;
