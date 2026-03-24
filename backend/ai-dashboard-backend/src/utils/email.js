import nodemailer from "nodemailer";
import logger from "./logger.js";

let transporter;
let initPromise;

export const initEmail = async () => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            if (process.env.NODE_ENV === "test") {
                transporter = {
                    sendMail: async () => {
                        logger.info("Fake email sent (test mode)");
                        return { messageId: "fake-message-id" };
                    },
                    verify: async () => true,
                };
                return;
            }

            if (process.env.NODE_ENV === "development") {
                transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || "587", 10),
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });
                logger.info(`Using custom Mailtrap transporter in development`);
            }
            else {
                // Production mode
                transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || "587", 10),
                    secure: process.env.SMTP_SECURE === "true",
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                logger.info("Using production email transporter");
            }

            await transporter.verify();
            logger.info("Email transporter ready!");
        } catch (err) {
            logger.error("Failed to init email transporter:", err);
            throw err;
        }
    })();

    return initPromise;
};

export const sendEmail = async ({ to, subject, html, text }) => {
    // Auto-initialize if not already done
    if (!transporter) {
        await initEmail();
    }

    if (!transporter) throw new Error("Email transporter not initialized");

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
};

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