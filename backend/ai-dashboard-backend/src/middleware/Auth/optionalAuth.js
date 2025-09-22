import { JWTManager } from "../../config/jwt.js";
import User, { USER_STATUS } from "../../models/User.js";
import logger from "../../utils/logger.js";
import extractToken from "./extractToken.js";

const optionalAuth = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) {
            req.user = null;
            req.token = null;
            return next();
        }

        const verification = await JWTManager.verifyAccessToken(token);
        if (!verification.valid) {
            req.user = null;
            req.token = null;
            return next();
        }

        const user = await User.findById(verification.decoded.userId).select("-password -__v").lean();
        if (!user || user.status !== USER_STATUS.ACTIVE) {
            req.user = null;
            req.token = null;
            return next();
        }

        req.user = user;
        req.token = { raw: token, decoded: verification.decoded, id: verification.decoded.jti };

        if (process.env.NODE_ENV === "development") {
            logger.debug("Optional auth success", { userId: user._id, email: user.email });
        }
        next();
    } catch (error) {
        logger.error("Optional auth error:", error);
        req.user = null;
        req.token = null;
        next();
    }
};
export default optionalAuth;
