import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "AI Dashboard",
  description: "Intelligent data analysis platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* AuthProvider must wrap SocketProvider so useAuth() works inside it */}
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#ffffff",
                  border: "1.5px solid #e9d5ff",
                  color: "#1e1b4b",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "13px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 24px rgba(139,92,246,0.12)",
                },
                success: { iconTheme: { primary: "#8b5cf6", secondary: "#fff" } },
                error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}