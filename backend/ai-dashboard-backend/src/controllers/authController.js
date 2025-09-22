import authService from "../services/authService.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import { JWTManager } from "../config/jwt.js";

// ================= PUBLIC CONTROLLERS =================

// Register new user
const register = async (req, res, next) => {
    try {
        const { firstName, lastName, username, email, password, role } = req.body;
        const ipAddress = req.clientIP || req.ip;
        const userAgent = req.headers["user-agent"];

        // Create user + get secure email token
        const { userId, verificationToken } = await authService.createUser({
            name: `${firstName} ${lastName}`,
            username,
            email,
            password,
            role,
            ipAddress,
            userAgent,
        });

        // Send verification email with correct token
        await authService.sendVerificationEmail(email, firstName, verificationToken);

        res.status(201).json({
            success: true,
            message: "User registered. Please verify your email.",
            userId,
        });
    } catch (err) {
        next(err);
    }
};

// Login
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.clientIP || req.ip;
        const userAgent = req.headers["user-agent"];

        const user = await authService.findUserByEmail(email);
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const { locked, minutesRemaining } = authService.isAccountLocked(user);
        if (locked) {
            return res.status(403).json({
                success: false,
                message: `Account locked. Try again in ${minutesRemaining} minutes.`,
            });
        }

        const validPassword = await authService.validatePassword(password, user.password);
        if (!validPassword) {
            await authService.handleFailedLogin(user._id, user.loginAttempts || 0, ipAddress);
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        await authService.resetFailedLoginAttempts(user._id, ipAddress);

        // Generate tokens + session
        const { accessToken, refreshToken } = await authService.generateAndStoreTokens(user, {
            ipAddress,
            userAgent,
        });

        authService.setAuthCookies(res, accessToken, refreshToken);

        res.json({
            success: true,
            message: "Login successful",
            accessToken,
            user: { id: user._id, email: user.email, role: user.role },
        });
    } catch (err) {
        next(err);
    }
};

// Refresh tokens
const refreshToken = async (req, res, next) => {
    try {
        const refreshTokenCookie = req.cookies.refreshToken;
        if (!refreshTokenCookie) {
            return res.status(401).json({ success: false, message: "No refresh token" });
        }

        // Verify JWT
        const decoded = await authService.validateRefreshToken(refreshTokenCookie);

        // Find existing active session
        const session = await Session.findActiveSession(refreshTokenCookie);
        if (!session) {
            return res.status(403).json({ success: false, message: "Session not found" });
        }

        // Generate new access + refresh
        const { token: newAccess } = JWTManager.generateAccessToken({
            userId: decoded.userId,
            role: decoded.role,
        });
        const { token: newRefresh } = JWTManager.generateRefreshToken({ userId: decoded.userId });

        // Rotate inside existing session
        await session.refreshSession(newRefresh, newAccess);

        // Send cookies back
        authService.setAuthCookies(res, newAccess, newRefresh);

        res.json({ success: true, accessToken: newAccess });
    } catch (err) {
        next(err);
    }
};
// Verify email
const verifyEmail = async (req, res, next) => {
    try {
        const token = req.params.token || req.query.token; // <-- support both
        const { email } = await authService.verifyEmailToken(token);
        res.json({ success: true, message: "Email verified", email });
    } catch (err) {
        next(err);
    }
};

// Resend verification
const resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.resendVerificationEmail(email);
        res.json({ success: true, message: "Verification email resent" });
    } catch (err) {
        next(err);
    }
};

// Forgot password
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const token = await authService.createPasswordResetToken(user._id);
        await authService.sendPasswordResetEmail(email, user.firstName, token);

        res.json({ success: true, message: "Password reset email sent" });
    } catch (err) {
        next(err);
    }
};

// Reset password
const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const record = await authService.validatePasswordResetToken(token);

        await authService.updatePassword(record.userId, password);

        res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        next(err);
    }
};

// ================= PROTECTED CONTROLLERS =================

const getProfile = async (req, res) => {
    res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res, next) => {
    try {
        console.log("updateProfile called", { user: req.user, body: req.body });

        // Only allow safe fields
        const allowedUpdates = ["firstName", "lastName", "username", "profile"];
        const updates = {};
        for (let key of allowedUpdates) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }

        if (!req.user?._id) {
            return res.status(400).json({ success: false, message: "Missing user ID in request" });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updates,
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error("updateProfile error:", err);
        next(err);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");

        const valid = await authService.validatePassword(currentPassword, user.password);
        if (!valid) return res.status(400).json({ success: false, message: "Current password is incorrect" });

        await authService.updatePassword(user._id, newPassword);
        res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        await Session.revokeSession(req.user._id);
        authService.clearAuthCookies(res);
        res.json({ success: true, message: "Logged out" });
    } catch (err) {
        next(err);
    }
};

const logoutAll = async (req, res, next) => {
    try {
        await Session.revokeUserSessions(req.user._id);
        authService.clearAuthCookies(res);
        res.json({ success: true, message: "Logged out from all devices" });
    } catch (err) {
        next(err);
    }
};

const getSessions = async (req, res, next) => {
    try {
        const sessions = await Session.getUserActiveSessions(req.user._id);
        res.json({ success: true, sessions });
    } catch (err) {
        next(err);
    }
};

const revokeSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found",
            });
        }

        if (session.status === "revoked") {
            return res.json({
                success: true,
                message: "Session already revoked",
            });
        }

        await Session.revokeSession(sessionId, req.user._id, "user_logout");

        return res.json({
            success: true,
            message: "Session revoked successfully",
        });
    } catch (err) {
        next(err);
    }
};


export default {
    register,
    login,
    refreshToken,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
    logout,
    logoutAll,
    getSessions,
    revokeSession,
};
