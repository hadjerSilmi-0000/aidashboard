import rateLimit from "express-rate-limit";

// Generic JSON handler
const handler = (req, res) => {
    res.status(429).json({
        success: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests, please try again later",
    });
};

// Auth-related limiter (login, signup, password reset)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
});

// General API limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler,
    standardHeaders: true,
    legacyHeaders: false,
});
