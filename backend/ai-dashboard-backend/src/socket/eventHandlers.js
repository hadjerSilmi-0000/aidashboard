export function registerEventHandlers(socket) {
    //  Global dashboard subscription
    socket.on("subscribe:dashboard", () => {
        console.log(`📡 User ${socket.id} subscribed to dashboard`);
        socket.join("dashboard");
    });

    socket.on("unsubscribe:dashboard", () => {
        console.log(`📴 User ${socket.id} unsubscribed from dashboard`);
        socket.leave("dashboard");
    });

    //  File-specific analytics subscription
    socket.on("subscribe:file", ({ fileId }) => {
        console.log(`User ${socket.id} subscribed to file:${fileId}`);
        socket.join(`file:${fileId}`);
    });

    socket.on("unsubscribe:file", ({ fileId }) => {
        console.log(`User ${socket.id} unsubscribed from file:${fileId}`);
        socket.leave(`file:${fileId}`);
    });

    // Simple heartbeat
    socket.on("ping", () => {
        socket.emit("pong", { time: new Date() });
    });

    socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
}
