export const injectUserContext = (req, res, next) => {
    if (!req.user) return next();

    req.user.hasPermission = (permission) => (req.user.effectivePermissions || []).includes(permission);
    req.user.hasPermissions = (perms) => perms.every((p) => req.user.hasPermission(p));
    req.user.hasRole = (role) => req.user.role === role;
    req.user.hasAnyRole = (roles) => roles.includes(req.user.role);
    req.user.isAdmin = () => req.user.role === "admin";
    req.user.isManager = () => ["admin", "manager"].includes(req.user.role);

    req.userContext = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
        sessionId: req.token?.id,
    };

    next();
};
