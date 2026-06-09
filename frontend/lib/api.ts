import axios from "axios";

export const api = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (!path.startsWith("/auth")) {
        localStorage.removeItem("accessToken");
        window.location.href = "/auth/login";
      }
    }
    if (status === 429) {
      console.warn("[API] Rate limited:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: (d: { firstName: string; lastName: string; username: string; email: string; password: string; role?: string }) =>
    api.post("/api/auth/register", d),
  login: (d: { email: string; password: string }) => api.post("/api/auth/login", d),
  logout: () => api.post("/api/auth/logout"),
  logoutAll: () => api.post("/api/auth/logout-all"),
  getProfile: () => api.get("/api/auth/profile"),
  updateProfile: (d: Record<string, unknown>) => api.put("/api/auth/profile", d),
  changePassword: (d: { currentPassword: string; newPassword: string }) =>
    api.post("/api/auth/change-password", d),
  refreshToken: () => api.post("/api/auth/refresh-token"),
  verifyEmail: (token: string) => api.get(`/api/auth/verify-email?token=${token}`),
  resendVerification: (email: string) =>
    api.post("/api/auth/resend-verification", { email }),
  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }),
  resetPassword: (d: { token: string; password: string }) =>
    api.post("/api/auth/reset-password", d),
  getSessions: () => api.get("/api/auth/sessions"),
  revokeSession: (id: string) => api.delete(`/api/auth/sessions/${id}`),
};

// ── Files ─────────────────────────────────────────────────────────────────
export const filesApi = {
  upload: (file: File, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total)
          onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },
  list: () => api.get("/api/files"),
  getById: (id: string) => api.get(`/api/files/${id}`),
  delete: (id: string) => api.delete(`/api/files/${id}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────
export const jobsApi = {
  enqueue: (fileId: string) => api.post("/api/jobs/enqueue", { fileId }),
  getStatus: (id: string) => api.get(`/api/jobs/${id}/status`),
  cancel: (id: string) => api.delete(`/api/jobs/${id}`),
  getStats: () => api.get("/api/jobs/stats/all"),
};

// ── AI Jobs ───────────────────────────────────────────────────────────────
export const aiJobsApi = {
  create: (d: { dataset: object; type: "analysis" | "insights" | "patterns" | "question" }) =>
    api.post("/api/ai/jobs", d),
  getById: (id: string) => api.get(`/api/ai/jobs/${id}`),
};

// ── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  fileOverview: (fileId: string) => api.get(`/api/analytics/file/${fileId}/overview`),
  fileTrends: (fileId: string, range = "day") =>
    api.get(`/api/analytics/file/${fileId}/trends?range=${range}`),
  fileErrors: (fileId: string) => api.get(`/api/analytics/file/${fileId}/errors`),
  runAnalytics: (fileId: string) => api.post(`/api/analytics/file/${fileId}/run`),
};

// ── Notifications ─────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (page = 1, limit = 20) => api.get(`/api/notification?page=${page}&limit=${limit}`),
  stats: () => api.get("/api/notification/stats"),
  markRead: (id: string) => api.patch(`/api/notification/${id}/read`),
  markAllRead: () => api.patch("/api/notification/read-all"),
  delete: (id: string) => api.delete(`/api/notification/${id}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────
export const adminApi = {
  // Dashboard
  overview: () => api.get("/api/admin/overview"),
  // Users
  listUsers: (page = 1, limit = 20) => api.get(`/api/admin/users?page=${page}&limit=${limit}`),
  getUserStats: () => api.get("/api/admin/users/stats"),
  updateUserRole: (userId: string, role: string) =>
    api.put(`/api/admin/users/${userId}/role`, { role }),
  updateUserStatus: (userId: string, status: string) =>
    api.put(`/api/admin/users/${userId}/status`, { status }),
  // System monitoring
  systemStats: () => api.get("/api/admin/stats"),
  metrics: () => api.get("/api/admin/metrics"),
  adminHealth: () => api.get("/api/admin/health"),
  getLogs: () => api.get("/api/admin/logs"),
  // Actions
  sendAlert: (message: string) => api.post("/api/admin/alerts", { message }),
  cleanup: () => api.post("/api/admin/cleanup"),
  revokeSessions: () => api.post("/api/admin/revoke-sessions"),
  restartJobs: () => api.post("/api/admin/restart-jobs"),
};

// ── Health ────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get("/health"),
};