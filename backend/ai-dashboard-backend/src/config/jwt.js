// src/config/jwt.js
import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key";
const EMAIL_SECRET = process.env.JWT_EMAIL_SECRET || "email_secret_key";
const RESET_SECRET = process.env.JWT_RESET_SECRET || "reset_secret_key";

export const JWTManager = {
    // Generate access token
    generateAccessToken(payload) {
        const token = jwt.sign(payload, ACCESS_SECRET, {
            expiresIn: "15m",
            audience: "ai-dashboard-users",
            issuer: "ai-dashboard",
        });
        return { token };
    },

    // Verify access token
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, ACCESS_SECRET);
            return { valid: true, decoded };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    },

    // Generate refresh token
    generateRefreshToken(payload) {
        const token = jwt.sign(payload, REFRESH_SECRET, {
            expiresIn: "7d",
            audience: "ai-dashboard-users",
            issuer: "ai-dashboard",
        });
        return { token };
    },

    // Verify refresh token
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, REFRESH_SECRET);
            return { valid: true, decoded };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    },

    // Generate email verification token
    generateEmailToken(payload) {
        const token = jwt.sign(payload, EMAIL_SECRET, {
            expiresIn: "24h",
            audience: "ai-dashboard-users",
            issuer: "ai-dashboard",
        });
        return { token };
    },

    // Verify email token
    verifyEmailToken(token) {
        try {
            const decoded = jwt.verify(token, EMAIL_SECRET);
            return { valid: true, decoded };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    },

    // Generate password reset token
    generatePasswordResetToken(payload) {
        const token = jwt.sign(payload, RESET_SECRET, {
            expiresIn: "1h",
            audience: "ai-dashboard-users",
            issuer: "ai-dashboard",
        });
        return { token };
    },

    // Verify password reset token
    verifyPasswordResetToken(token) {
        try {
            const decoded = jwt.verify(token, RESET_SECRET);
            return { valid: true, decoded };
        } catch (err) {
            return { valid: false, error: err.message };
        }
    },
};
