import Redis from "ioredis";
import logger from "./logger.js";

const redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error:", err));

// Prefixes for organization
const PREFIX = {
    TOKEN_BLACKLIST: "auth:blacklist:",
    EMAIL_VERIFICATION: "auth:email:",
    PASSWORD_RESET: "auth:reset:",
};

// ===== TOKEN BLACKLIST =====
export const blacklistToken = async (tokenId, expiresIn = 3600) => {
    const key = `${PREFIX.TOKEN_BLACKLIST}${tokenId}`;
    await redis.setex(key, expiresIn, "blacklisted");
};

export const isTokenBlacklisted = async (tokenId) => {
    const key = `${PREFIX.TOKEN_BLACKLIST}${tokenId}`;
    return (await redis.get(key)) !== null;
};

// ===== EMAIL VERIFICATION =====
export const storeEmailVerification = async (token, userId, expiresIn = 86400) => {
    const key = `${PREFIX.EMAIL_VERIFICATION}${token}`;
    await redis.setex(key, expiresIn, userId.toString());
};

export const validateEmailVerification = async (token) => {
    const key = `${PREFIX.EMAIL_VERIFICATION}${token}`;
    const userId = await redis.get(key);
    if (userId) await redis.del(key);
    return userId;
};

// ===== PASSWORD RESET =====
export const storePasswordReset = async (token, userId, expiresIn = 3600) => {
    const key = `${PREFIX.PASSWORD_RESET}${token}`;
    await redis.setex(key, expiresIn, userId.toString());
};

export const validatePasswordReset = async (token) => {
    const key = `${PREFIX.PASSWORD_RESET}${token}`;
    const userId = await redis.get(key);
    if (userId) await redis.del(key);
    return userId;
};

export default redis;
