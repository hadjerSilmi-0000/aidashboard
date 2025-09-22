import { JWTManager } from "../../config/jwt.js";
import User, { USER_STATUS } from "../../models/User.js";
import logger from "../../utils/logger.js";
import extractToken from "./extractToken.js";
import { authError } from "../../utils/authError.js";

const requireAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) return authError(res, 401, "TOKEN_REQUIRED", "Authentication token is required");

        const verification = await JWTManager.verifyAccessToken(token);
        if (!verification.valid) {
            return authError(res, 401, "TOKEN_INVALID", "Invalid or expired token", { reason: verification.error });
        }

        const user = await User.findById(verification.decoded.userId).select("-password -__v").lean();
        if (!user) return authError(res, 401, "USER_NOT_FOUND", "User not found");

        if (user.status !== USER_STATUS.ACTIVE) {
            return authError(res, 403, "USER_INACTIVE", "User account is not active", { status: user.status });
        }

        if (user.security?.lockUntil && user.security.lockUntil > new Date()) {
            return authError(res, 423, "USER_LOCKED", "User account is temporarily locked", { until: user.security.lockUntil });
        }

        if (!user.emailVerified && process.env.REQUIRE_EMAIL_VERIFICATION === "true") {
            return authError(res, 403, "EMAIL_NOT_VERIFIED", "Email verification required");
        }

        req.user = user;
        req.token = { raw: token, decoded: verification.decoded, id: verification.decoded.jti };

        logger.debug("User authenticated", { userId: user._id, role: user.role });
        next();
    } catch (error) {
        logger.error("Authentication error:", error);
        return authError(res, 500, "AUTH_ERROR", "Authentication failed", process.env.NODE_ENV === "development" ? error.message : undefined);
    }
};
export default requireAuth;
