import mongoose from "mongoose";
import bcrypt from "bcrypt";
import validator from "validator";

export const USER_ROLES = {
    ADMIN: "admin",
    MANAGER: "manager",
};

export const USER_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended",
    PENDING: "pending",
};

const userSchema = new mongoose.Schema(
    {
        // ── Identity ────────────────────────────────────────────────────────
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, "Invalid email format"],
            index: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
            maxlength: 30,
            validate: {
                validator: (v) => /^[a-zA-Z0-9_-]+$/.test(v),
                message: "Invalid username format",
            },
        },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        password: { type: String, required: true, select: false },

        // ── Role & Status ───────────────────────────────────────────────────
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.MANAGER,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.PENDING,
            index: true,
        },

        // ── Email Verification ──────────────────────────────────────────────
        // ✅ FIXED: was buried inside notificationPreferences — authService
        //    accesses these at root level (user.emailVerified, user.status etc.)
        emailVerified: { type: Boolean, default: false },

        // ── Security / Login tracking ───────────────────────────────────────
        loginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null },
        lastLogin: { type: Date },
        lastLoginIP: { type: String },

        // ── Password Reset ──────────────────────────────────────────────────
        passwordResetToken: { type: String, select: false },
        passwordResetExpires: { type: Date, select: false },

        // ── Profile ─────────────────────────────────────────────────────────
        profile: {
            avatar: {
                type: String,
                validate: { validator: (v) => !v || validator.isURL(v), message: "Invalid URL" },
            },
            bio: { type: String, maxlength: 500 },
        },

        // ── Notification Preferences ─────────────────────────────────────────
        notificationPreferences: {
            mutedTypes: [{ type: String }],
            deliveryChannels: {
                inApp: { type: Boolean, default: true },
                email: { type: Boolean, default: false },
                sms: { type: Boolean, default: false },
            },
        },
    },
    { timestamps: true }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────

userSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// ✅ isLocked now reads from root-level lockUntil
userSchema.virtual("isLocked").get(function () {
    return this.lockUntil && this.lockUntil > Date.now();
});

// ─── Middleware ────────────────────────────────────────────────────────────

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// ─── Instance methods ──────────────────────────────────────────────────────

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;