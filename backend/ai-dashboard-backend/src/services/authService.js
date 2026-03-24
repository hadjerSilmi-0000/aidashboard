import bcrypt from "bcrypt";
import { JWTManager } from "../config/jwt.js";
import { sendEmail } from "../utils/email.js";
import logger from "../utils/logger.js";
import User, { USER_STATUS } from "../models/User.js";
import Session from "../models/Session.js";
import SecurityLog from "../models/SecurityLog.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5", 10);
const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION || "30", 10);

const authService = {
    // ===== USER CREATION =====
    async createUser({ name, username, email, password, role = "manager", ipAddress, userAgent }) {
        try {
            const [firstName, ...lastNameParts] = (name || "").split(" ");
            const lastName = lastNameParts.join(" ");

            const user = await User.create({
                firstName,
                lastName,
                username,
                email,
                password,
                role,
                emailVerified: false,
                loginAttempts: 0,
                lockUntil: null,
            });

            //  Secure JWT token for email verification
            const { token: verificationToken } = JWTManager.generateEmailToken({
                userId: user._id,
                email: user.email,
            });

            await SecurityLog.create({
                userId: user._id,
                action: "USER_REGISTERED",
                ipAddress,
                userAgent,
                details: { email, role },
            });

            return { userId: user._id, verificationToken };
        } catch (err) {
            if (err.code === 11000 && err.keyPattern?.email) {
                throw new Error("Email already registered");
            }
            if (err.code === 11000 && err.keyPattern?.username) {
                throw new Error("Username already taken");
            }
            throw err;
        }
    },

    // ===== EMAIL VERIFICATION =====
    async sendVerificationEmail(email, firstName, token) {
        const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        await sendEmail({
            to: email,
            subject: "Verify your account",
            html: `
      <p>Hi ${firstName},</p>
      <p>Click below to verify your email:</p>
      <a href="${verifyLink}" target="_blank">${verifyLink}</a>
      <p>This link will expire in 24 hours.</p>
    `,
        });
    },

    async verifyEmailToken(token) {
        const { valid, decoded, error } = await JWTManager.verifyEmailToken(token);
        if (!valid) throw new Error("Invalid or expired verification token");

        const user = await User.findById(decoded.userId);
        if (!user) throw new Error("User not found");

        if (user.emailVerified) return { email: user.email };

        user.emailVerified = true;
        user.status = USER_STATUS.ACTIVE;
        await user.save();

        await SecurityLog.create({
            userId: user._id,
            action: "EMAIL_VERIFIED",
            details: { email: user.email },
        });

        return { email: user.email };
    },

    async resendVerificationEmail(email) {
        const user = await User.findOne({ email });
        if (!user) throw new Error("User not found");
        if (user.emailVerified) throw new Error("Email already verified");

        //  New JWT each time
        const { token } = JWTManager.generateEmailToken({
            userId: user._id,
            email: user.email,
        });

        await this.sendVerificationEmail(email, user.firstName, token);

        await SecurityLog.create({
            userId: user._id,
            action: "VERIFICATION_EMAIL_RESENT",
            details: { email },
        });
    },

    // ===== LOGIN HELPERS =====
    async findUserByEmail(email) {
        return User.findOne({ email }).select("+password");
    },

    async validatePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    },

    isAccountLocked(user) {
        const lockUntil = user.lockUntil;
        if (lockUntil && lockUntil > Date.now()) {
            const minutesRemaining = Math.ceil((lockUntil - Date.now()) / (60 * 1000));
            return { locked: true, minutesRemaining };
        }
        return { locked: false };
    },

    async handleFailedLogin(userId, currentAttempts = 0, ipAddress) {
        const attempts = currentAttempts + 1;
        const updates = { loginAttempts: attempts };

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            updates.lockUntil = new Date(Date.now() + LOCKOUT_DURATION * 60 * 1000);
            await SecurityLog.create({
                userId,
                action: "ACCOUNT_LOCKED",
                ipAddress,
                details: { attempts },
            });
        } else {
            await SecurityLog.create({
                userId,
                action: "LOGIN_FAILED",
                ipAddress,
                details: { attempts },
            });
        }

        await User.findByIdAndUpdate(userId, updates, { new: true });
    },

    async resetFailedLoginAttempts(userId, ipAddress) {
        await User.findByIdAndUpdate(userId, {
            loginAttempts: 0,
            lockUntil: null,
        });

        await SecurityLog.create({
            userId,
            action: "LOGIN_SUCCESS",
            ipAddress,
        });
    },

    // ===== TOKENS / SESSIONS =====
    async generateAndStoreTokens(user, { ipAddress = null, userAgent = null } = {}) {
        const { token: accessToken } = JWTManager.generateAccessToken({
            userId: user._id,
            role: user.role,
        });
        const { token: refreshToken } = JWTManager.generateRefreshToken({ userId: user._id });

        const session = await Session.createSession({
            userId: user._id,
            refreshToken,
            accessToken,
            ipAddress,
            userAgent,
        });

        await SecurityLog.create({
            userId: user._id,
            action: "SESSION_CREATED",
            details: { sessionId: session._id },
        });

        return { accessToken, refreshToken, jti: session._id };
    },

    async validateRefreshToken(refreshToken) {
        return JWTManager.verifyRefreshToken(refreshToken);
    },

    setAuthCookies(res, accessToken, refreshToken) {
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    },

    clearAuthCookies(res) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
    },

    // ===== PASSWORD RESET =====
    async createPasswordResetToken(userId) {
        const { token } = JWTManager.generatePasswordResetToken({ userId });
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        await SecurityLog.create({
            userId,
            action: "PASSWORD_RESET_REQUESTED",
        });

        return token;
    },

    async sendPasswordResetEmail(email, firstName, token) {
        const resetLink = `${FRONTEND_URL}/reset-password/${token}`;

        await sendEmail({
            to: email,
            subject: "Password Reset",
            html: `
              <p>Hi ${firstName},</p>
              <p>Click below to reset your password:</p>
              <a href="${resetLink}" target="_blank">${resetLink}</a>
            `,
        });
    },
    async validatePasswordResetToken(token) {
        const { valid, decoded } = JWTManager.verifyPasswordResetToken(token);
        if (!valid) throw new Error("Invalid or expired reset token");

        // Get user from DB
        const user = await User.findById(decoded.userId).select("+passwordResetExpires");
        if (!user) throw new Error("User not found");

        // Check if token expired
        if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            throw new Error("Reset token has expired");
        }

        return { userId: user._id };
    },

    async updatePassword(userId, newPassword) {
        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await User.findByIdAndUpdate(userId, {
            password: hashed,
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });
        await Session.revokeUserSessions(userId);
        await SecurityLog.create({
            userId,
            action: "PASSWORD_CHANGED",
        });
    },
};

export default authService;
