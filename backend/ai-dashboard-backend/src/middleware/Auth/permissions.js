import logger from "../../utils/logger.js";
import { authError } from "../../utils/authError.js";

const requirePermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return authError(res, 401, "AUTH_REQUIRED", "Authentication required for permission-based access");
        }

        const userPermissions = req.user.effectivePermissions || [];
        const missingPermissions = permissions.filter((p) => !userPermissions.includes(p));

        if (missingPermissions.length > 0) {
            return authError(res, 403, "INSUFFICIENT_PERMISSIONS", "User lacks required permissions", {
                required: permissions,
                missing: missingPermissions,
                current: userPermissions,
            });
        }

        logger.debug("Permission check success", { userId: req.user._id, permissions: userPermissions });
        next();
    };
};
export default requirePermissions;
