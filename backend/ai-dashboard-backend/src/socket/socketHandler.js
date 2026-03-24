import { Server } from "socket.io";
import { registerEventHandlers } from "./eventHandlers.js";
import socketService from "../services/socketService.js";
import { JWTManager } from "../config/jwt.js";

let io;

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            credentials: true,
        },
    });

    // Attach io to socketService for global use
    socketService.setIO(io);

    // Auth middleware for every socket connection
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace("Bearer ", "");

            if (!token) {
                return next(new Error("Authentication error: no token provided"));
            }

            // ✅ FIXED: was JWTManager(token) — must be verifyAccessToken
            const { valid, decoded, error } = JWTManager.verifyAccessToken(token);

            if (!valid) {
                return next(new Error(`Authentication error: ${error}`));
            }

            socket.data.user = decoded;
            return next();
        } catch (err) {
            return next(new Error(`Socket auth failed: ${err.message}`));
        }
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;
        console.log(`Client connected: ${socket.id} — userId: ${user?.userId}`);

        // Join dashboard room (backward compat)
        socket.join("dashboard");

        // Join user-specific room for targeted events
        if (user?.userId) {
            socket.join(user.userId.toString());
        }

        // Join role-based room for broadcast by role
        if (user?.role) {
            socket.join(`role:${user.role}`);
        }

        console.log(
            `User ${user?.userId} joined rooms: dashboard, ${user?.userId}, role:${user?.role}`
        );

        // Register custom event handlers (subscribe/unsubscribe etc.)
        registerEventHandlers(socket);

        socket.on("disconnect", (reason) => {
            console.log(`User ${user?.userId} disconnected (${socket.id}) — ${reason}`);
        });
    });
}

export function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}