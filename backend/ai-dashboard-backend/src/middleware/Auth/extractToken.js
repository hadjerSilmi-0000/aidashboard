const extractToken = (req) => {
    let token = null;

    // Check cookies first
    if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    // Then check Authorization header
    else if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        token = authHeader.startsWith("Bearer ")
            ? authHeader.substring(7)
            : authHeader;
    }

    return token;
};

export default extractToken;
