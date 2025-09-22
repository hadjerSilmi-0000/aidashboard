import logger from "../../utils/logger.js";
import { authError } from "../../utils/authError.js";

export const requireSelfOrAdmin = (userIdParam = "userId") => {
    return (req, res, next) => {
        if (!req.user) {
            return authError(res, 401, "AUTH_REQUIRED", "Authentication required");
        }

        const targetUserId = req.params[userIdParam] || req.body.userId;
        const currentUserId = req.user._id.toString();
        const isAdmin = req.user.role === "admin";

        if (currentUserId !== targetUserId && !isAdmin) {
            return authError(res, 403, "ACCESS_DENIED", "Only self or admin can access this resource");
        }

        logger.debug("Self/admin check success", { userId: req.user._id, targetUserId, isAdmin });
        next();
    };
};

export const requireOwnership = (ownerFieldPath = "createdBy") => {
    return (req, res, next) => {
        if (!req.user) {
            return authError(res, 401, "AUTH_REQUIRED", "Authentication required for ownership check");
        }

        const resource = req.resource;
        if (!resource) {
            return authError(res, 404, "RESOURCE_NOT_FOUND", "Resource not found");
        }

        const ownerIds = ownerFieldPath.split(".").reduce((obj, key) => obj?.[key], resource);
        const resourceOwnerId = Array.isArray(ownerIds) ? ownerIds[0] : ownerIds;
        const currentUserId = req.user._id.toString();
        const isAdmin = req.user.role === "admin";

        if (resourceOwnerId?.toString() !== currentUserId && !isAdmin) {
            return authError(res, 403, "ACCESS_DENIED", "Insufficient privileges for this resource");
        }

        next();
    };
};

export default requireOwnership;
