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
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.MANAGER,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.PENDING,
        },
        notificationPreferences: {
            mutedTypes: [{ type: String }],
            deliveryChannels: {
                inApp: { type: Boolean, default: true },
                email: { type: Boolean, default: false },
                sms: { type: Boolean, default: false }
            },
            emailVerified: { type: Boolean, default: false },
            emailVerificationToken: { type: String, select: false },
            emailVerificationExpires: { type: Date, select: false },

            // Security
            loginAttempts: { type: Number, default: 0 },
            lockUntil: { type: Date },
            lastLogin: { type: Date },
            lastLoginIP: { type: String },

            // Profile
            profile: {
                avatar: { type: String, validate: (v) => !v || validator.isURL(v) },
                bio: { type: String, maxlength: 500 },
            },
        },
    },
    { timestamps: true }

);

// Virtuals
userSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.virtual("isLocked").get(function () {
    return this.lockUntil && this.lockUntil > Date.now();
});

// Middleware
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Methods
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
