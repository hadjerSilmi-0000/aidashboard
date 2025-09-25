import nodemailer from "nodemailer";
import logger from "./logger.js";

let transporter;

if (process.env.NODE_ENV === "development") {
    // Use Ethereal in dev
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
    logger.info(`Ethereal test account created: ${testAccount.user}`);
} else {
    // Use real SMTP in prod
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// Verify connection at startup
transporter.verify().then(() => {
    logger.info("Email transporter ready");
}).catch((err) => {
    logger.error("Email transporter error:", err);
});

// ===== Send Email (generic) =====
export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || "AI Dashboard <noreply@aidashboard.local>",
            to,
            subject,
            html,
            text,
        });

        logger.info(`Email sent: ${info.messageId}`);

        if (process.env.NODE_ENV === "development") {
            logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }

        return info;
    } catch (err) {
        logger.error("Email send failed:", err);
        throw err;
    }
};

// ===== Helpers =====
export const sendVerificationEmail = async (user, token) => {
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    return sendEmail({
        to: user.email,
        subject: "Verify your account",
        html: `<p>Hello ${user.name}, please verify your email: 
           <a href="${link}">${link}</a></p>`,
        text: `Hello ${user.name}, verify your email here: ${link}`,
    });
};

export const sendPasswordResetEmail = async (user, token) => {
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    return sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        html: `<p>Hello ${user.name}, reset your password here: 
           <a href="${link}">${link}</a></p>`,
        text: `Hello ${user.name}, reset your password here: ${link}`,
    });
};
