import requireAuth from "./requireAuth.js";
import optionalAuth from "./optionalAuth.js";
import { requireRoles, requireAdmin, requireManager } from "./roles.js";
import requirePermissions from "./permissions.js";   // default export
import { requireSelfOrAdmin, requireOwnership } from "./ownership.js";
import { injectUserContext } from "./userContext.js";
import requireApiKey, { requireAuthOrApiKey } from "./apiKey.js"; // default + named

export default {
    requireAuth,
    optionalAuth,
    requireRoles,
    requirePermissions,
    requireAdmin,
    requireManager,
    requireSelfOrAdmin,
    requireOwnership,
    injectUserContext,
    requireApiKey,
    requireAuthOrApiKey,
};