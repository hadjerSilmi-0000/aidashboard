import mongoose from "mongoose";
import crypto from "crypto";

const SessionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        // Token identifiers
        refreshToken: { type: String, required: true, unique: true, index: true },
        accessTokenHash: { type: String, required: true, index: true },

        // Metadata
        ipAddress: { type: String, required: false },
        userAgent: { type: String, maxlength: 1000, default: null },

        // Lifecycle
        status: { type: String, enum: ["active", "expired", "revoked"], default: "active", index: true },
        createdAt: { type: Date, default: Date.now },
        lastAccessedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: false, index: { expireAfterSeconds: 0 } },

        // Revocation info
        revokedAt: { type: Date, default: null },
        revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        revokedReason: { type: String, default: null },
    },
    { timestamps: true, collection: "sessions" }
);

//  Auto set expiry and access hash on new session
SessionSchema.pre("save", function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    if (this.isNew && this.refreshToken && this.accessTokenHash) {
        this.lastAccessedAt = new Date();
    }
    next();
});

//  Create new session
SessionSchema.statics.createSession = async function ({ userId, refreshToken, accessToken, ipAddress, userAgent }) {
    const accessTokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
    const session = new this({ userId, refreshToken, accessTokenHash, ipAddress, userAgent });
    return await session.save();
};

//  Find active session
SessionSchema.statics.findActiveSession = function (refreshToken) {
    return this.findOne({ refreshToken, status: "active", expiresAt: { $gt: new Date() } }).populate("userId", "email role");
};

//  Revoke single session
SessionSchema.statics.revokeSession = function (sessionId, revokedBy, reason = "user_logout") {
    return this.findByIdAndUpdate(sessionId, { status: "revoked", revokedAt: new Date(), revokedBy, revokedReason: reason }, { new: true });
};

//  Revoke all sessions for user
SessionSchema.statics.revokeUserSessions = function (userId, excludeSessionId = null, reason = "logout_all") {
    const query = { userId, status: "active" };
    if (excludeSessionId) query._id = { $ne: excludeSessionId };
    return this.updateMany(query, { status: "revoked", revokedAt: new Date(), revokedReason: reason });
};

//  Clean expired sessions
SessionSchema.statics.cleanupExpiredSessions = function () {
    return this.deleteMany({ $or: [{ expiresAt: { $lt: new Date() } }, { status: "expired" }] });
};

//  Get all active sessions for user
SessionSchema.statics.getUserActiveSessions = function (userId) {
    return this.find({ userId, status: "active", expiresAt: { $gt: new Date() } })
        .sort({ lastAccessedAt: -1 })
        .select("-refreshToken -accessTokenHash");
};

//  Refresh session (rotate tokens)
SessionSchema.methods.refreshSession = async function (newRefreshToken, newAccessToken) {
    this.refreshToken = newRefreshToken;
    this.accessTokenHash = crypto.createHash("sha256").update(newAccessToken).digest("hex");
    this.lastAccessedAt = new Date();
    return await this.save();
};

const Session = mongoose.model("Session", SessionSchema);
export default Session;
