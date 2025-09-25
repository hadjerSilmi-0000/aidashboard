import mongoose from "mongoose";

const { Schema } = mongoose;

const securityLogSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
        ipAddress: { type: String, index: true },
        userAgent: { type: String },

        action: {
            type: String,
            enum: [
                //  Registration & Email
                "USER_REGISTERED",
                "EMAIL_VERIFIED",
                "EMAIL_VERIFICATION_SENT",
                "EMAIL_VERIFICATION_SUCCESS",
                "VERIFICATION_EMAIL_RESENT",

                // Login/Logout
                "LOGIN_SUCCESS",
                "LOGIN_FAILED",
                "LOGOUT",
                "ACCOUNT_LOCKED",

                //  Sessions
                "SESSION_CREATED",
                "SESSION_REVOKED",

                // Password
                "PASSWORD_CHANGED",
                "PASSWORD_RESET_REQUESTED",
                "PASSWORD_RESET_SUCCESS",
            ],
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["success", "failed", "blocked", "warning"],
            default: "success",
            index: true,
        },

        details: { type: Object },
        timestamp: { type: Date, default: Date.now, index: true },
    },
    { collection: "security_logs" }
);

export default mongoose.model("SecurityLog", securityLogSchema);
