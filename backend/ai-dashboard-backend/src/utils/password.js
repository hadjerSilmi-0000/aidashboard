import bcrypt from "bcryptjs";
import zxcvbn from "zxcvbn";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);


//Hash a password securely
export async function hashPassword(password) {
    if (!password) throw new Error("Password is required");
    return bcrypt.hash(password, SALT_ROUNDS);
}


//Compare plain password with hash
export async function comparePassword(password, hash) {
    if (!password || !hash) return false;
    return bcrypt.compare(password, hash);
}


//Check if password is strong enough
export function validatePasswordStrength(password, userInfo = {}) {
    const result = zxcvbn(password, [
        userInfo.email,
        userInfo.username,
        userInfo.firstName,
        userInfo.lastName
    ].filter(Boolean));

    return {
        score: result.score, // 0 (weak) → 4 (strong)
        feedback: result.feedback,
        isValid: result.score >= 3 // require "good" or better
    };
}
