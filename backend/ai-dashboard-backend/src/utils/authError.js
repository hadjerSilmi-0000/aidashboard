//auth error
export const authError = (res, status, code, message, details) =>
    res.status(status).json({
        success: false,
        error: { code, message, ...(details && { details }) },
    });
