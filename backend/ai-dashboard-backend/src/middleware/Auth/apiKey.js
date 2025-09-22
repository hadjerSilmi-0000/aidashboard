import logger from "../../utils/logger.js";
import { authError } from "../../utils/authError.js";

const VALID_API_KEYS = (process.env.API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

const requireApiKey = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || !VALID_API_KEYS.includes(apiKey)) {
        return authError(res, 401, "API_KEY_INVALID", "Invalid or missing API key");
    }

    logger.debug("API key accepted", { prefix: apiKey.substring(0, 8) });
    next();
};

export const requireAuthOrApiKey = (req, res, next) => {
    if (req.user) return next();
    return requireApiKey(req, res, next);
};
export default requireApiKey;
