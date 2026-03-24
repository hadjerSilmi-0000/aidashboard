/**
 * cache.js
 * Redis-backed cache utilities.
 * FIXED: getRedis() is async so await import() is valid inside it.
 * Falls back to a silent no-op when USE_REDIS !== "true".
 */

import logger from "./logger.js";

// ── Lazy Redis singleton ──────────────────────────────────────────────────

let redis = null;
let initialised = false;

async function getRedis() {
    if (initialised) return redis;
    initialised = true;

    if (process.env.USE_REDIS !== "true") {
        return null;
    }

    try {
        const { default: Redis } = await import("ioredis");
        redis = new Redis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379", 10),
            password: process.env.REDIS_PASSWORD || undefined,
        });

        redis.on("connect", () => logger.info("Cache Redis connected"));
        redis.on("error", (err) => logger.error("Cache Redis error:", err.message));
    } catch (err) {
        logger.warn(`ioredis not available — cache disabled: ${err.message}`);
        redis = null;
    }

    return redis;
}

// ── No-op fallback when Redis is unavailable ──────────────────────────────

const noop = {
    setex: async () => null,
    get: async () => null,
    del: async () => null,
};

/** Returns the Redis client or the no-op object. Always awaitable. */
async function client() {
    return (await getRedis()) ?? noop;
}

// ── Key prefixes ──────────────────────────────────────────────────────────

const PREFIX = {
    TOKEN_BLACKLIST: "auth:blacklist:",
    EMAIL_VERIFICATION: "auth:email:",
    PASSWORD_RESET: "auth:reset:",
};

// ── Token Blacklist ───────────────────────────────────────────────────────

export const blacklistToken = async (tokenId, expiresIn = 3600) => {
    const c = await client();
    await c.setex(`${PREFIX.TOKEN_BLACKLIST}${tokenId}`, expiresIn, "blacklisted");
};

export const isTokenBlacklisted = async (tokenId) => {
    const c = await client();
    return (await c.get(`${PREFIX.TOKEN_BLACKLIST}${tokenId}`)) !== null;
};

// ── Email Verification ────────────────────────────────────────────────────

export const storeEmailVerification = async (token, userId, expiresIn = 86400) => {
    const c = await client();
    await c.setex(`${PREFIX.EMAIL_VERIFICATION}${token}`, expiresIn, userId.toString());
};

export const validateEmailVerification = async (token) => {
    const c = await client();
    const key = `${PREFIX.EMAIL_VERIFICATION}${token}`;
    const userId = await c.get(key);
    if (userId) await c.del(key);
    return userId;
};

// ── Password Reset ────────────────────────────────────────────────────────

export const storePasswordReset = async (token, userId, expiresIn = 3600) => {
    const c = await client();
    await c.setex(`${PREFIX.PASSWORD_RESET}${token}`, expiresIn, userId.toString());
};

export const validatePasswordReset = async (token) => {
    const c = await client();
    const key = `${PREFIX.PASSWORD_RESET}${token}`;
    const userId = await c.get(key);
    if (userId) await c.del(key);
    return userId;
};

export default client;