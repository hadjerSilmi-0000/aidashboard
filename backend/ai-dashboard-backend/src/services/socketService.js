let ioInstance = null;

/**
 * Socket service wrapper.
 * - setIO(io): called once from socketHandler
 * - broadcast(event, payload): emit to all in dashboard room
 * - emitToSocket(socketId, event, payload): emit to one socket
 * - emitToRoom(room, event, payload): emit to a custom room
 * - emitToUser(userId, event, payload): emit to all sockets of one user
 * - emitToRole(role, event, payload): emit to all users of a role
 */
const socketService = {
    setIO(io) {
        ioInstance = io;
    },

    broadcast(event, payload) {
        if (!ioInstance) {
            console.warn("socketService.broadcast called before io initialized", { event });
            return;
        }
        ioInstance.to("dashboard").emit(event, payload);
    },

    emitToSocket(socketId, event, payload) {
        if (!ioInstance) return;
        const socket = ioInstance.sockets.sockets.get(socketId);
        if (socket) socket.emit(event, payload);
    },

    emitToRoom(room, event, payload) {
        if (!ioInstance) return;
        ioInstance.to(room).emit(event, payload);
    },

    /**
     * Emit to all sockets of a single user
     */
    emitToUser(userId, event, payload) {
        if (!ioInstance) return;
        ioInstance.to(userId.toString()).emit(event, payload);
    },

    /**
     * Emit to all users with a given role
     */
    emitToRole(role, event, payload) {
        if (!ioInstance) return;
        ioInstance.to(`role:${role}`).emit(event, payload);
    },
};

export default socketService;
