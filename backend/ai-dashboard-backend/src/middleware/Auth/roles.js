import logger from "../../utils/logger.js";
import { authError } from "../../utils/authError.js";

export const requireRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return authError(res, 401, "AUTH_REQUIRED", "Authentication required for role-based access");
        }

        if (!roles.includes(req.user.role)) {
            return authError(res, 403, "INSUFFICIENT_ROLE", "Insufficient role privileges", {
                required: roles,
                current: req.user.role,
            });
        }

        logger.debug("Role check success", { userId: req.user._id, role: req.user.role, requiredRoles: roles });
        next();
    };
};

export const requireAdmin = requireRoles("admin");
export const requireManager = requireRoles("admin", "manager");
