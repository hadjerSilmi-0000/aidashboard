"use client";
import React, {
    createContext, useContext, useEffect, useRef, useState,
} from "react";
import { useAuth } from "./auth-context";

// Minimal interface so we don't need to import the full socket.io-client type at top level
interface SocketLike {
    on(event: string, fn: (...args: any[]) => void): void;
    off(event: string, fn: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    disconnect(): void;
    connected: boolean;
}

interface SocketCtxValue {
    socket: SocketLike | null;
    connected: boolean;
}

const SocketContext = createContext<SocketCtxValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState<SocketLike | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!user) {
            // Logout: clean up existing socket
            setSocket((prev) => {
                if (prev) {
                    try { prev.emit("unsubscribe:dashboard"); } catch { }
                    try { prev.disconnect(); } catch { }
                }
                return null;
            });
            setConnected(false);
            return;
        }

        const token = localStorage.getItem("accessToken");
        if (!token) return;

        let sock: any = null;

        import("socket.io-client")
            .then(({ io }) => {
                const url =
                    process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";

                sock = io(url, {
                    auth: { token },
                    transports: ["websocket", "polling"],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 2000,
                });

                sock.on("connect", () => {
                    sock.emit("subscribe:dashboard");
                    setConnected(true);
                });

                sock.on("disconnect", () => setConnected(false));

                sock.on("connect_error", (err: Error) => {
                    console.warn("[Socket] connect_error:", err.message);
                });

                setSocket(sock);
            })
            .catch((err) => {
                console.warn("[Socket] Could not load socket.io-client:", err.message);
            });

        return () => {
            if (sock) {
                try { sock.emit("unsubscribe:dashboard"); } catch { }
                try { sock.off(); } catch { }
                try { sock.disconnect(); } catch { }
            }
            setSocket(null);
            setConnected(false);
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket(): SocketCtxValue {
    return useContext(SocketContext);
}

/**
 * Subscribe to a socket event. The handler is kept stable via a ref,
 * so it can be an inline function without causing effect re-runs.
 */
export function useSocketEvent<T = unknown>(
    event: string,
    handler: (data: T) => void,
): void {
    const { socket, connected } = useSocket();
    const savedHandler = useRef(handler);

    // Always keep savedHandler.current up-to-date
    useEffect(() => {
        savedHandler.current = handler;
    });

    useEffect(() => {
        if (!socket || !connected) return;
        const fn = (data: T) => savedHandler.current(data);
        socket.on(event, fn);
        return () => socket.off(event, fn);
    }, [socket, connected, event]);
}