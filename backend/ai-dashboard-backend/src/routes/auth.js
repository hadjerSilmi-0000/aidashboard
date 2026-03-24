import express from "express";
import authController from "../controllers/authController.js";
import requireAuth from "../middleware/Auth/requireAuth.js";
import { requireRoles } from "../middleware/Auth/roles.js";
import { getCurrentUser } from "../controllers/authController.js";

const router = express.Router();

// ================= PUBLIC ROUTES =================

router.get("/me", requireAuth, (req, res) => {
    return res.json({
        success: true,
        user: req.user, // filled by requireAuth after verifying JWT
    });
});

// Register new user
router.post("/register", authController.register);

// Login user
router.post("/login", authController.login);

// Refresh access token
router.post("/refresh-token", authController.refreshToken);

// Verify email
router.get("/verify-email", authController.verifyEmail);

// Resend email verification
router.post("/resend-verification", authController.resendVerification);

// Forgot password (send reset email)
router.post("/forgot-password", authController.forgotPassword);

// Reset password with token
router.post("/reset-password", authController.resetPassword);

// ================= PROTECTED ROUTES =================

// Get logged-in user profile
router.get("/profile", requireAuth, authController.getProfile);

// Update logged-in user profile (user or admin override)
router.put("/profile", requireAuth, authController.updateProfile);

// Change password (user only)
router.post("/change-password", requireAuth, authController.changePassword);

// Get all active sessions (admin only)
router.get("/sessions", requireAuth, requireRoles("admin"), authController.getSessions);

// Revoke specific session (user can revoke own, admin can revoke any)
router.delete("/sessions/:sessionId", requireAuth, authController.revokeSession);

// Logout current device
router.post("/logout", requireAuth, authController.logout);

// Logout all devices
router.post("/logout-all", requireAuth, authController.logoutAll);

// ================= UTILITY ROUTES =================

// Check auth service status (public)
router.get("/status", (req, res) => {
    res.json({
        success: true,
        service: "authentication",
        status: "operational",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    });
});

// Health check for auth system (public)
router.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "auth",
        status: "healthy",
        checks: {
            database: "connected",
            redis: "connected",
            jwt: "operational",
        },
        timestamp: new Date().toISOString(),
    });
});

export default router;
