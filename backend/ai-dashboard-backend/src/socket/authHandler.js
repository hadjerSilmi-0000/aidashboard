import User from "../models/User.js";
import { JWTManager } from "../config/jwt.js";

/**
 * Minimal cookie parser for server-side cookie header string.
 * @param {string} cookieHeader
 * @returns {Object}
 */
function parseCookies(cookieHeader = "") {
    return cookieHeader.split(";").reduce((acc, pair) => {
        const [k, v] = pair.split("=").map((s) => s && s.trim());
        if (k && v !== undefined) acc[k] = decodeURIComponent(v);
        return acc;
    }, {});
}

export default function attachAuth(io) {
    io.use(async (socket, next) => {
        try {
            // Prefer token provided via client handshake auth
            const tokenFromAuth = socket.handshake?.auth?.token;
            let token = tokenFromAuth;

            // Fallback: cookie header
            if (!token) {
                const cookieHeader = socket.handshake?.headers?.cookie || "";
                const cookies = parseCookies(cookieHeader);
                // adjust cookie name to your project if different
                token = cookies.accessToken || cookies.access_token || cookies.token;
            }

            if (!token) {
                const err = new Error("Authentication error: no token provided");
                err.data = { code: "NO_TOKEN" };
                return next(err);
            }

            // Verify token using your JWTManager
            // Replace `verifyAccessToken` if your JWTManager uses a different method name.
            let decoded;
            try {
                decoded = await JWTManager.verifyAccessToken(token);
            } catch (err) {
                // If JWTManager throws on invalid/expired tokens, forward as auth error
                const e = new Error("Authentication error: invalid token");
                e.data = { code: "INVALID_TOKEN", details: err.message };
                return next(e);
            }

            // Example decoded shape: { userId, role, iat, exp }
            if (!decoded || !decoded.userId) {
                const err = new Error("Authentication error: bad token payload");
                err.data = { code: "BAD_PAYLOAD" };
                return next(err);
            }

            // Optionally load the user from DB to confirm still exists
            const user = await User.findById(decoded.userId).select("-password").lean();
            if (!user) {
                const err = new Error("Authentication error: user not found");
                err.data = { code: "USER_NOT_FOUND" };
                return next(err);
            }

            // Attach user info to socket for later handlers and for authorization
            socket.data.user = {
                userId: user._id.toString(),
                role: user.role,
                email: user.email,
                username: user.username,
            };

            return next();
        } catch (err) {
            // Generic failure
            return next(err);
        }
    });
}
