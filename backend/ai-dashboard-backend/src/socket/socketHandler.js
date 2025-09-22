import { Server } from "socket.io";
import { registerEventHandlers } from "./eventHandlers.js";
import socketService from "../services/socketService.js";
import { verifyAccessToken } from "../config/jwt.js"; // adjust if your JWT utils live elsewhere

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

    io.on("connection", (socket) => {
        console.log(`⚡ Client connected: ${socket.id}`);

        try {
            // Expect JWT token in handshake auth
            const token = socket.handshake.auth?.token;
            if (!token) {
                console.warn("❌ No token provided, disconnecting...");
                socket.disconnect();
                return;
            }

            const user = verifyAccessToken(token); // { _id, role, ... }

            if (!user?._id) {
                console.warn("❌ Invalid user, disconnecting...");
                socket.disconnect();
                return;
            }

            // Join dashboard room (keeps backward compatibility)
            socket.join("dashboard");

            // Join user-specific room
            socket.join(user._id.toString());

            // Join role-based room
            if (user.role) {
                socket.join(`role:${user.role}`);
            }

            console.log(`✅ User ${user._id} joined rooms: dashboard, ${user._id}, role:${user.role}`);

            // Register any custom event handlers
            registerEventHandlers(socket);

            socket.on("disconnect", () => {
                console.log(`👋 User ${user._id} disconnected (${socket.id})`);
            });
        } catch (err) {
            console.error("❌ Socket auth error:", err.message);
            socket.disconnect();
        }
    });
}

export function getIO() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}
